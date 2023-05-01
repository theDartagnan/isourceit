import { observer, PropTypes as MPropTypes } from 'mobx-react';
import React from 'react';
import { ListGroup } from 'react-bootstrap';

function ExamQuestionsView({ exam }) {
  return (
    <ListGroup>
      {
        exam.questions?.map((question) => (
          <ListGroup.Item key={question}>{question}</ListGroup.Item>
        ))
        }
    </ListGroup>
  );
}

ExamQuestionsView.propTypes = {
  exam: MPropTypes.objectOrObservableObject.isRequired,
};

export default observer(ExamQuestionsView);
