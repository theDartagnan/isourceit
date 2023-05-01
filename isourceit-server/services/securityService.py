import hashlib
import logging
from datetime import timedelta
from typing import Optional, Dict
from uuid import uuid4

from flask import current_app
from itsdangerous import URLSafeSerializer, BadData
from werkzeug.exceptions import Unauthorized, BadRequest
from mongoDAO import userRepository, examRepository, studentActionRepository
from mongoDAO.MongoDAO import MongoDAO
from mongoModel.StudentAction import START_EXAM_TYPE, SUBMIT_EXAM_TYPE
from services.studentAuthUrlService import generate_exam_auth_validation_url
from services.mailService import MailService
from sessions.sessionManagement import clear_session, STUDENT_ROLE, build_user_context_from_session, \
    init_composition_session, init_admin_session

LOG = logging.getLogger(__name__)


def get_ticket_security_key():
    secret_key = current_app.config.get('TICKET_STUDENT_KEY')
    if secret_key is None:
        LOG.warning('Security ticket student key is not given, setup an unsecure key')
        return 'my_secret_key'
    return secret_key


def get_ticket_salt_key():
    return current_app.config.get('TICKET_STUDENT_SALT', "chat-ai-exam-srv")


def hash_password(password: str) -> Optional[str]:
    if not password:
        return None
    return hashlib.sha3_512(password.encode()).hexdigest()


def create_exam_composition_url_ticket(exam_id: str, username: str, token: str) -> str:
    secret_key = get_ticket_security_key()
    salt = get_ticket_salt_key()
    s1 = URLSafeSerializer(secret_key, salt=salt)
    return s1.dumps({
        'exam_id': exam_id,
        'username': username,
        'token': token
    })


def load_exam_composition_info_from_ticket(ticket: str) -> Dict[str, str]:
    secret_key = get_ticket_security_key()
    salt = get_ticket_salt_key()
    s1 = URLSafeSerializer(secret_key, salt=salt)
    return s1.loads(ticket)


def authenticate_user(username: str, password: str) -> None:
    if not username or not password:
        raise BadRequest("Missing username or password for authentication")
    mongo_dao = MongoDAO()
    user = userRepository.find_user_by_username(mongo_dao, username, with_password=True)
    if not user:
        raise Unauthorized("bad credential")
    hashed_given_pass = hash_password(password)
    if user['password'] != hashed_given_pass:
        raise Unauthorized("bad credential")
    # Create session info
    init_admin_session(username, user['role'])


def initiate_student_composition_access(exam_id: str, username: str) -> str:
    if not exam_id or not username:
        raise BadRequest("Missing information for authentication")
    # Retrieve exam students information
    mongo_dao = MongoDAO()
    student_access = examRepository.find_student_access_for_exam(mongo_dao, exam_id, username)
    if student_access is None:
        raise Unauthorized("User not authorized to access this exam")
    # If token not known, generate a new token and update course access
    token = student_access.get('access_token')
    if token is None:
        token = str(uuid4())
        examRepository.set_student_token(mongo_dao, exam_id, username, token)
    # Create an access ticket
    ticket = create_exam_composition_url_ticket(exam_id, username, token)
    # Create the access complete url
    access_url = generate_exam_auth_validation_url(ticket)
    # Send a mail with to ticket to the user
    mail_svc = MailService()
    mail_svc.send_mail_for_student_composition(student_access['username'], student_access['exam_name'], access_url)

    return access_url


def authenticate_student_from_ticket(ticket: str) -> None:
    # Process authentication and identification
    try:
        student_info = load_exam_composition_info_from_ticket(ticket)
    except BadData:
        raise Unauthorized("bad ticket")

    exam_id = student_info.get('exam_id')
    username = student_info.get('username')
    token = student_info.get('token')
    if exam_id is None or username is None or token is None:
        raise Unauthorized("Missing credential")
    mongo_dao = MongoDAO()
    student_access = examRepository.find_student_access_for_exam(mongo_dao, exam_id, username)
    if student_access is None:
        raise Unauthorized("User not authorized to access this exam")
    good_token = student_access.get('access_token')
    if good_token is None or good_token != token:
        raise Unauthorized("Wrong token")

    # find student's actions for this exam related to its start or end
    exam_act = studentActionRepository.find_exam_action_for_student_for_exam(mongo_dao, username, exam_id)
    exam_started = False
    exam_ended = False
    timeout = None
    for action in exam_act:
        if action['action_type'] == START_EXAM_TYPE:
            exam_started = True
            timeout = action['timestamp'] + timedelta(minutes=student_access['duration_minutes'])
        elif action['action_type'] == SUBMIT_EXAM_TYPE:
            exam_ended = True
            timeout = None
        else:
            LOG.warning('Unmanaged action type for auth: %s.', action['action_type'])

    # set session info
    init_composition_session(username, role=STUDENT_ROLE, exam_id=exam_id, exam_started=exam_started,
                             exam_ended=exam_ended, timeout=timeout)


def get_user_context() -> None:
    return build_user_context_from_session()


def logout() -> None:
    clear_session()
