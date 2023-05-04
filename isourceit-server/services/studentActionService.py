import logging
from datetime import datetime, timedelta
from typing import Mapping, cast, Dict, Iterable
import pydantic
from werkzeug.exceptions import Unauthorized, BadRequest
from mongoDAO import studentActionRepository, examRepository
from mongoDAO.MongoDAO import MongoDAO
from mongoModel.StudentAction import STUDENT_ACTION_TYPE_MAPPING, EXTERNAL_RESOURCE_TYPE, \
    AskChatAI, StartExam, SubmitExam, ExternalResource, \
    WroteInitialAnswer, WroteFinalAnswer, StudentAction, ChangedQuestion, LostFocus
from services import ChatAIManager
from services.ChatAIManager import ChatAIManager
from services.securityService import decrypt_exam_chat_api_key
from sessions.sessionManagement import session_username, update_session_student_info, \
    is_exam_ended, is_exam_started, session_exam_id, get_ws_sid

LOG = logging.getLogger(__name__)


def handle_action(action_data: Dict) -> Mapping:
    # In any case check exam is not finished
    if is_exam_ended():
        raise Unauthorized('Exam must not be ended')

    # check that action_data has at least a proper type
    if 'action_type' not in action_data:
        raise BadRequest("Missing action type")
    # cast action according to action type
    action_class = STUDENT_ACTION_TYPE_MAPPING.get(action_data['action_type'], None)
    if action_class is None:
        raise BadRequest("Bad action type")

    # retrieve exam Info: duration_minutes, questions
    mongo_dao = MongoDAO()
    exam = examRepository.find_exam_by_id(mongo_dao, session_exam_id(),
                                          projection={'duration_minutes': 1,
                                                      'questions': 1,
                                                      'selected_chats': 1})
    if exam is None:
        raise BadRequest("No exam matchin session exam id")

    # Inject / force username, course id and student username
    if not action_data.get('timestamp', None):
        action_data['timestamp'] = datetime.utcnow()
    action_data['exam_id'] = session_exam_id()
    action_data['student_username'] = session_username()

    action = cast(action_class, pydantic.create_model_from_typeddict(action_class)(**action_data).dict())
    # remove action id and _id
    action.pop('id', None)
    action.pop('_id', None)

    # if action type is START_EXAM_TYPE: assert exam is not started, then update session
    if action_class == StartExam:
        if is_exam_started():
            raise BadRequest('Cannot handle Start exam action; exam already started')
        # create action
        action_id = studentActionRepository.create_student_action(mongo_dao, action)
        # update session with exam started marker and timeout
        timeout = action_data['timestamp'] + timedelta(minutes=exam['duration_minutes'])
        update_session_student_info(exam_started=True, timeout=timeout)
        return {
            'timestamp': action['timestamp'],
            'id': action_id,
            'exam_started': True,
            'timeout': timeout
        }

    # if action type is SUBMIT_EXAM_TYPE: assert exam is started, then update session
    if action_class == SubmitExam:
        if not is_exam_started():
            raise BadRequest('Cannot handle Submit exam action; exam not started')
        # create action
        action_id = studentActionRepository.create_student_action(mongo_dao, action)
        update_session_student_info(exam_ended=True)
        return {
            'timestamp': action['timestamp'],
            'id': action_id,
            'exam_ended': True
        }

    # otherwise action is relative to a question. Exam should be started
    if not is_exam_started():
        raise BadRequest('Cannot handle Submit exam action; exam not started')

    # Check action question idx is given and relative to an existing question
    if action.get('question_idx') is None or action['question_idx'] < 0 or action['question_idx'] > len(exam['questions']):
        raise BadRequest('Bad question idx')

    # if action is asking to a chat: check the chat key is allowed
    if action_class == AskChatAI and action['chat_id'] not in exam['selected_chats']:
        raise BadRequest("Bad chat key")

    # save action into db
    action_id = studentActionRepository.create_student_action(mongo_dao, action)

    # process response and specific handling of action
    if action_class == ChangedQuestion:
        return {
            'timestamp': action['timestamp'],
            'question_idx': action['question_idx'],
            'next_question_idx': action['next_question_idx'],
            'id': action_id
        }
    elif action_class == LostFocus:
        return {
            'timestamp': action['timestamp'],
            'question_idx': action.get('question_idx', None),
            'id': action_id,
            'return_timestamp': action['return_timestamp'],
            'duration_seconds': action['duration_seconds'],
            'page_hidden': action['page_hidden'],
        }
    elif action_class == AskChatAI:
        exam_chat_settings = exam['selected_chats'].get(action['chat_id'])
        if exam_chat_settings is None:
            LOG.warning('no exam chat sttings for chat_id {}'.format(action['chat_id']))
            raise BadRequest('Bad chat_id')
        private_key = decrypt_exam_chat_api_key(exam_chat_settings.get('api_key', None))
        chat_ai_mgr = ChatAIManager()
        ws_sid = get_ws_sid()
        result = {
            'timestamp': action['timestamp'],
            'question_idx': action['question_idx'],
            'id': action_id,
            'chat_id': action['chat_id'],
            'chat_key': action['chat_key'],
            'prompt': action['prompt'],
        }
        if ws_sid is not None:
            chat_ai_mgr.process_prompt(action_id, action, ws_sid, private_key=private_key)
        else:
            LOG.warning('No ws id, will not be able to return reponse!')
            result['achieved'] = True
            result['answer'] = '<Chat service connection error. Unable to process the promp>'
        return result
    elif action_class == ExternalResource:
        return {
            'timestamp': action['timestamp'],
            'question_idx': action['question_idx'],
            'id': action_id,
            'title': action['title'],
            'description': action['description'],
            'rsc_type': action['rsc_type'],
            'removed': False
        }
    elif action_class in (WroteInitialAnswer, WroteFinalAnswer):
        return {
            'timestamp': action['timestamp'],
            'question_idx': action['question_idx'],
            'id': action_id,
            'text': action['text']
        }
    else:
        LOG.warning('Warning action type unmanaged: %s.', action['action_type'])
        return {
            'timestamp': action['timestamp'],
            'question_idx': action['question_idx'],
            'id': action_id
        }


def mark_external_resource_removed(action_id) -> None:
    # check exam is started but not finished
    if not is_exam_started() or is_exam_ended():
        raise Unauthorized('Exam must be started and not ended')

    # Get action
    mongo_dao = MongoDAO()
    action = studentActionRepository.find_action_by_id(mongo_dao, action_id)
    # check action properties with session info: exam_id, question_idx, student_username,
    # check action_type is EXTERNAL_RESOURCE_TYPE
    if action['exam_id'] != session_exam_id() \
            or action['student_username'] != session_username() \
            or action['action_type'] != EXTERNAL_RESOURCE_TYPE:
        raise Unauthorized("Unauthorized action modification")
    # check resource not already removed
    if action['removed'] is not None:
        raise BadRequest("Action already removed")
    # mak action as removed
    studentActionRepository.mark_external_resource_removed(mongo_dao, action_id, datetime.now())


def get_exam_student_actions(exam_id: str, student_username: str) -> Iterable[StudentAction]:
    # retrieve exam to check its existence and check authors
    current_username = session_username()
    mongo_dao = MongoDAO()
    exam = examRepository.find_exam_by_id(mongo_dao, exam_id, projection={'authors': 1})
    if not any(
            filter(lambda uname: uname == current_username, map(lambda author: author['username'], exam['authors']))):
        raise Unauthorized("Only authors might modify their exam")
    # Remove _id, id and exam_id
    projection = {
        '_id': 0,
        'id': 0,
        'exam_id': 0
    }
    return studentActionRepository.get_actions_for_student_for_exam(mongo_dao, username=student_username,
                                                                    exam_id=exam_id, projection=projection)