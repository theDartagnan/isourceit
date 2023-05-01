import React, { useContext, useReducer } from 'react';
import {
  Alert, Button, Col, Form, Row,
} from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import { observer } from 'mobx-react';
import RootStore from '../../../RootStore';

function initState() {
  return {
    username: '',
    disabled: false,
    tokenGenerated: false,
    error: null,
  };
}

function reduce(state, action) {
  switch (action.type) {
    case 'set-username':
      return { ...state, username: action.value };
    case 'set-generating':
      return {
        ...state, disabled: true, tokenGenerated: false, error: null,
      };
    case 'set-token':
      return {
        ...state, disabled: false, tokenGenerated: action.value, error: null,
      };
    case 'set-error':
      return {
        ...state, disabled: false, tokenGenerated: null, error: action.error,
      };
    default:
      throw new Error(`Illegal action type to reduce: ${action.type}.`);
  }
}

function StudentTokenGeneration() {
  const { examId } = useParams();
  const { currentUser } = useContext(RootStore);
  const [state, dispatch] = useReducer(reduce, initState());

  const attemptGenerateToken = (e) => {
    e.preventDefault();
    const username = state.username.trim();
    if (username) {
      dispatch({ type: 'set-generating' });
      currentUser.generateAuthToken({ examId, username })
        .then(
          (token) => dispatch({ type: 'set-token', value: token }),
          (error) => dispatch({ type: 'set-error', error }),
        );
    }
  };

  return (
    <Row className="justify-content-center">
      <Col xs={12} sm={10} md={6} lg={4}>
        <Alert variant="success" className="mb-3">
          <Alert.Heading>Examinee token generation</Alert.Heading>
          <p>
            This login page is reserved to students that attempt to log for a particular exam.
            Please enter your email address to receive a connection link.
          </p>
        </Alert>
        <Form onSubmit={attemptGenerateToken}>
          <fieldset disabled={state.disabled}>
            <Form.Group className="mb-3" controlId="LoginExamId">
              <Form.Label>ExamId</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter examId"
                required
                disabled
                value={examId}
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="LoginUsername">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter email"
                required
                value={state.username}
                onChange={(e) => dispatch({ type: 'set-username', value: e.target.value })}
              />
            </Form.Group>
            <Button variant="primary" type="submit">
              Generate token
            </Button>
          </fieldset>
        </Form>
        {
          state.tokenGenerated && (
            <Alert variant="success" className="mt-3">
              <Alert.Heading>Token successfully generated</Alert.Heading>
              <p className="text-wrap">
                A connection link has been sent to your email address. You can now close this page.
              </p>
              {
                state.tokenGenerated.url && (
                  <p className="text-wrap text-break">
                    Token:
                    {' '}
                    {state.tokenGenerated.url}
                  </p>
                )
              }
            </Alert>
          )
        }
        {
          state.error && (
            <Alert variant="danger" className="mt-3">
              {state.error?.message ?? 'unknown error'}
            </Alert>
          )
        }
      </Col>
    </Row>
  );
}

export default observer(StudentTokenGeneration);