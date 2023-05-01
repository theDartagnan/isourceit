import { observer } from 'mobx-react';
import React, { useContext, useEffect, useReducer } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button, Col, Form, Row,
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSave, faTrash } from '@fortawesome/free-solid-svg-icons';
import ExamMgmtStore from '../ExamMgmtStore';
import { AdvancedLoading } from '../../../common/components/Loading';

function initState() {
  return {
    loading: true,
    saving: false,
    name: '',
    description: '',
    questions: [],
    durationMinutes: 0,
    rawAuthors: '',
    rawStudents: '',
    selectedChats: [],
  };
}

function computeSelectedChats(availableChats, examSelectedChats = null) {
  return availableChats.map((chat) => {
    const chatSelector = { ...chat };
    const selectedChat = examSelectedChats ? examSelectedChats[chatSelector.id] : null;
    chatSelector.selected = !!selectedChat;
    if (chatSelector.selected && chatSelector.privateKeyRequired) {
      chatSelector.apiKey = selectedChat.api_key;
    }
    return chatSelector;
  });
}

function reduce(state, action) {
  switch (action.type) {
    case 'set-loading':
      return { ...state, loading: true };
    case 'set-for-creation':
      return {
        ...initState(),
        loading: false,
        selectedChats: computeSelectedChats(action.availableChats),
      };
    case 'set-for-edition': {
      const { exam, availableChats } = action;
      return {
        ...state,
        loading: false,
        name: exam.name,
        description: exam.description,
        questions: exam.questions?.length ? [...exam.questions] : [],
        durationMinutes: exam.durationMinutes,
        rawAuthors: exam.authors.map((a) => a.username).join('\n'),
        rawStudents: exam.students.map((s) => s.username).join('\n'),
        selectedChats: computeSelectedChats(availableChats, exam.selectedChats),
      };
    }
    case 'set-raw-field':
      return { ...state, [action.field]: action.value };
    case 'set-duration':
      return { ...state, durationMinutes: Number(action.value) };
    case 'add-question':
      return {
        ...state,
        questions: [...state.questions, ''],
      };
    case 'set-question':
      return {
        ...state,
        questions: [
          ...state.questions.slice(0, action.questionIdx),
          action.value,
          ...state.questions.slice(action.questionIdx + 1),
        ],
      };
    case 'delete-question':
      return {
        ...state,
        questions: state.questions.filter((_, idx) => idx !== action.questionIdx),
      };
    case 'switch-selected-chat':
      return {
        ...state,
        selectedChats: [
          ...state.selectedChats.slice(0, action.chatIdx),
          {
            ...state.selectedChats[action.chatIdx],
            selected: !state.selectedChats[action.chatIdx].selected,
          },
          ...state.selectedChats.slice(action.chatIdx + 1),
        ],
      };
    case 'set-chat-apiKey':
      return {
        ...state,
        selectedChats: [
          ...state.selectedChats.slice(0, action.chatIdx),
          {
            ...state.selectedChats[action.chatIdx],
            apiKey: action.value,
          },
          ...state.selectedChats.slice(action.chatIdx + 1),
        ],
      };
    case 'set-saving':
      return { ...state, saving: action.value };
    default:
      throw new Error(`Illegal action type ${action.type}.`);
  }
}

function computeExamJsonFromState(state, examId) {
  const jsonRep = {
    name: state.name.trim(),
    description: state.description.trim(),
    questions: state.questions.map((q) => q.trim()).filter((q) => !!q),
    duration_minutes: state.durationMinutes,
    authors: state.rawAuthors.split('\n')
      .map((a) => a.trim()).filter((a) => !!a)
      .map((a) => ({ username: a })),
    students: state.rawStudents.split('\n')
      .map((a) => a.trim()).filter((a) => !!a)
      .map((a) => ({ username: a })),
    selected_chats: state.selectedChats.filter((c) => c.selected)
      .map((c) => [c.id, c.apiKey ? { api_key: c.apiKey } : {}])
      .reduce((acc, [k, v]) => {
        acc[k] = v;
        return acc;
      }, {}),
  };
  if (examId) {
    jsonRep.id = examId;
  }
  return jsonRep;
}

function ExamEditor({ newExam }) {
  const navigate = useNavigate();
  const { examId } = useParams();
  const { manager } = useContext(ExamMgmtStore);
  const [state, dispatch] = useReducer(reduce, initState());

  useEffect(() => {
    dispatch({ type: 'set-loading' });
    if (newExam && !examId) {
      manager.loadAvailableChats().then((availableChats) => dispatch({ type: 'set-for-creation', availableChats }));
    } else if (!newExam && examId) {
      Promise.all([
        manager.loadAvailableChats(),
        manager.loadDetailedExam({ examId }),
      ]).then(([availableChats, exam]) => dispatch({ type: 'set-for-edition', exam, availableChats }));
    } else {
      console.warn(`Illegal state for exam creation. NewExam: ${newExam} | examId: ${examId}`);
    }
  }, [manager, newExam, examId]);

  const submit = (e) => {
    e.preventDefault();
    const jsonRep = computeExamJsonFromState(state, examId);
    dispatch({ type: 'set-saving', value: true });
    manager.saveExam(jsonRep).then(() => {
      navigate(-1);
    }).catch((er) => {
      dispatch({ type: 'set-saving', value: false });
      console.warn(er);
    });
  };

  return (
    <Row className="justify-content-center">
      <Col xs={12} sm={12} md={12} lg={10}>
        <AdvancedLoading
          loading={manager.loading}
          loadingError={manager.loadingError}
        >
          <Form onSubmit={submit}>
            <fieldset disabled={state.saving}>
              <Row>
                <Col xs={12} sm={6} lg={3}>
                  <h3 className="text-primary">General</h3>
                  <Form.Group className="mb-3" controlId="exam-edit-name">
                    <Form.Label>Name</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Your exam name"
                      value={state.name}
                      onChange={(e) => dispatch({ type: 'set-raw-field', field: 'name', value: e.target.value })}
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3" controlId="exam-edit-duration">
                    <Form.Label>Duration in minutes</Form.Label>
                    <Form.Control
                      type="number"
                      placeholder="60"
                      min="1"
                      step="1"
                      value={state.durationMinutes}
                      onChange={(e) => dispatch({ type: 'set-duration', value: e.target.value })}
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3" controlId="exam-edit-description">
                    <Form.Label>Description</Form.Label>
                    <Form.Control
                      as="textarea"
                      placeholder="Description"
                      rows={5}
                      value={state.description}
                      onChange={(e) => dispatch({ type: 'set-raw-field', field: 'description', value: e.target.value })}
                      required
                    />
                    <Form.Text className="text-muted">
                      A text that will be given to student before they start the exam
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col xs={12} sm={6} lg={3}>
                  <h3 className="text-primary">Questions</h3>
                  {
                    state.questions?.map((question, idx) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <Form.Group className="mb-1" controlId={`exam-edit-question-${idx}`} key={idx}>
                        <Form.Label>
                          {`Question ${idx + 1}`}
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => dispatch({ type: 'delete-question', questionIdx: idx })}
                            className="ms-2"
                          >
                            <FontAwesomeIcon icon={faTrash} aria-hidden="true" title="delete question" />
                          </Button>
                        </Form.Label>
                        <Form.Control
                          as="textarea"
                          placeholder="Your Question"
                          rows={3}
                          value={state.questions[idx]}
                          onChange={(e) => dispatch({ type: 'set-question', questionIdx: idx, value: e.target.value })}
                          required
                        />
                      </Form.Group>
                    ))
                  }
                  <div className="d-grid gap-2">
                    <Button variant="success" onClick={() => dispatch({ type: 'add-question' })}>
                      <FontAwesomeIcon icon={faPlus} className="me-1" aria-hidden="true" title="Add question" />
                    </Button>
                  </div>
                </Col>
                <Col xs={12} sm={6} lg={3}>
                  <h3 className="text-primary">Members</h3>
                  <Form.Group className="mb-3" controlId="exam-edit-authors">
                    <Form.Label>Authors</Form.Label>
                    <Form.Control
                      as="textarea"
                      placeholder="author@mail.com"
                      rows={4}
                      value={state.rawAuthors}
                      onChange={(e) => dispatch({ type: 'set-raw-field', field: 'rawAuthors', value: e.target.value })}
                    />
                    <Form.Text className="text-muted">
                      Provide one username/email per line.
                      Authors will be allowed to show the exam detail
                      (except your API private keys) and access analytics
                    </Form.Text>
                  </Form.Group>
                  <Form.Group className="mb-3" controlId="exam-edit-students">
                    <Form.Label>Students</Form.Label>
                    <Form.Control
                      as="textarea"
                      placeholder="student@mail.com"
                      rows={10}
                      value={state.rawStudents}
                      onChange={(e) => dispatch({ type: 'set-raw-field', field: 'rawStudents', value: e.target.value })}
                    />
                    <Form.Text className="text-muted">
                      Provide one email per line. Student will be allowed to do the exam
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col xs={12} sm={6} lg={3}>
                  <h3 className="text-primary">Chat AI Allowed</h3>
                  {
                    state.selectedChats.map((choice, idx) => (
                      <Row key={choice.id} className="mb-3">
                        <Col xs="auto">
                          <Form.Check
                            type="switch"
                            id={`chat-choice-${choice.id}`}
                            label={choice.title}
                            checked={choice.selected}
                            onChange={() => dispatch({ type: 'switch-selected-chat', chatIdx: idx })}
                          />
                        </Col>
                        {
                          choice.selected && choice.privateKeyRequired && (
                            <Col xs="auto">
                              <Form.Group controlId={`chat-choice-${choice.id}-pvKey`}>
                                <Form.Label>Chat API Key</Form.Label>
                                <Form.Control
                                  type="text"
                                  placeholder="you private API key"
                                  required
                                  value={choice.apiKey ?? ''}
                                  onChange={(e) => dispatch({ type: 'set-chat-apiKey', chatIdx: idx, value: e.target.value })}
                                />
                                <Form.Text className="text-muted">
                                  Your private key will be used by all the examinee,
                                  but will never be communicated to anyone
                                </Form.Text>
                              </Form.Group>
                            </Col>
                          )
                        }
                      </Row>
                    ))
                  }
                </Col>
              </Row>
              <Row className="justify-content-center">
                <Col xs="auto">
                  <Button type="submit" variant="success" size="lg">
                    <FontAwesomeIcon icon={faSave} className="me-1" aria-hidden="true" title="delete question" />
                    Save
                  </Button>
                </Col>
              </Row>
            </fieldset>
          </Form>
        </AdvancedLoading>
      </Col>
    </Row>
  );
}

/*
1 Row
- 1 colone "General" avec nom (input), duration (input number min 0, step 15), description (textare)
- 1 colone "Questions" avec list item de textarea de question + icon poubelle + un bouton add
- 1 colone "Members avec 1 textare authors username/mails et 1 textare student mails
- 1 colone "Chat AI parameters" avec llistes de chat switch, input si selected et key require
1 Row colonne : bouton save

name: '',
    description: '',
    questions: [],
    durationMinutes: 0,
    rawAuthors: '',
    rawStudents: '',
    selectedChats: [],
*/

ExamEditor.propTypes = {
  newExam: PropTypes.bool,
};

ExamEditor.defaultProps = {
  newExam: false,
};

export default observer(ExamEditor);
