import React from 'react';
import { observer, PropTypes as MPropTypes } from 'mobx-react';
import { Button, Col, Row } from 'react-bootstrap';
import classNames from 'classnames';

function getButtonVariant(question) {
  if (question.finalAnswer) {
    return 'outline-success';
  }
  if (question.initAnswer || question.chatActions?.length || question.resources?.length) {
    return 'outline-warning';
  }
  return 'outline-danger';
}

function questionLabelExtract(label, maxSize = 13) {
  if (label.length <= maxSize) {
    return label;
  }
  return `${label.substring(0, maxSize - 3)}...`;
}

function QuestionMenu({ exam }) {
  return (
    <Row className="border-end border-dark border-3 h-100">
      <Col>
        <h4><u>Questions</u></h4>
        <div className="d-grid gap-2">
          {
            exam.questions?.map((question, idx) => (
              <Button
                key={question.id}
                variant={getButtonVariant(question, exam.currentQuestion)}
                className={classNames('mb-0', { 'text-decoration-underline': question === exam.currentQuestion && !exam.onSubmit })}
                onClick={() => exam.changeQuestion(question.id)}
              >
                {`Q${idx + 1}: ${questionLabelExtract(question.label)}`}
              </Button>
            ))
          }
          <Button variant="primary" className="mt-5" onClick={() => exam.goOnSubmit()}>
            Submit Exam
          </Button>
        </div>
      </Col>
    </Row>
  );
}

QuestionMenu.propTypes = {
  exam: MPropTypes.objectOrObservableObject.isRequired,
};

export default observer(QuestionMenu);
