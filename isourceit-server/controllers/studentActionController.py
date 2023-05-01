from flask import request, Blueprint
from services import studentActionService
from sessions.securedEndpoint import secured_endpoint
from sessions.sessionManagement import STUDENT_ROLE, TEACHER_ROLE, ADMIN_ROLE

__all__ = ['student_action_controller']

student_action_controller = Blueprint('student_action', __name__)


@student_action_controller.route("/api/rest/composition/actions", methods=['POST'])
@secured_endpoint(STUDENT_ROLE)
def send_action():
    data = request.get_json(force=False)
    return studentActionService.handle_action(data)


@student_action_controller.route("/api/rest/composition/actions/external-resources/<action_id>", methods=['DELETE'])
@secured_endpoint(STUDENT_ROLE)
def delete_resource(action_id: str):
    studentActionService.mark_external_resource_removed(action_id)
    return '', 204


@student_action_controller.route("/api/rest/admin/exams/<exam_id>/students/<student_username>/actions", methods=['GET'])
@secured_endpoint(TEACHER_ROLE, ADMIN_ROLE)
def get_admin_exam_student_actions(exam_id: str, student_username: str):
    return studentActionService.get_exam_student_actions(exam_id, student_username)