import { ROOT_AX, ROOT_URL } from '../../RESTInfo';

export function getExamSummary() {
  return ROOT_AX.get(`${ROOT_URL}/admin/exams`)
    .then((res) => res.data);
}

export function getExamDetails({ examId }) {
  return ROOT_AX.get(`${ROOT_URL}/admin/exams/${examId}`, {
    params: {
      with_action_summary: true,
    },
  })
    .then((res) => res.data);
}

export function createExam({ exam }) {
  return ROOT_AX.post(`${ROOT_URL}/admin/exams`, exam)
    .then((res) => res.data);
}

export function updateExam({ exam }) {
  return ROOT_AX.put(`${ROOT_URL}/admin/exams/${exam.id}`, exam)
    .then((res) => res.data);
}

export function loadStudentActions({ examId, studentUsername }) {
  return ROOT_AX.get(`${ROOT_URL}/admin/exams/${examId}/students/${studentUsername}/actions`)
    .then((res) => res.data);
}

export function getAppAvailableChats() {
  return ROOT_AX.get(`${ROOT_URL}/admin/app-settings/chats-available`)
    .then((res) => res.data);
}

export function getExamReport({ examId }) {
  return ROOT_AX.get(`${ROOT_URL}/admin/exams/${examId}/reports`)
    .then((res) => res.data);
}

export function getReportInfo({ reportId }) {
  return ROOT_AX.get(`${ROOT_URL}/admin/reports/${reportId}`)
    .then((res) => res.data);
}

export function clearReports() {
  return ROOT_AX.delete(`${ROOT_URL}/admin/reports`)
    .then((res) => res.data);
}
