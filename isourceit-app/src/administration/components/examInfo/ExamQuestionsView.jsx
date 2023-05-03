import { observer, PropTypes as MPropTypes } from 'mobx-react';
import React from 'react';
import { ListGroup } from 'react-bootstrap';

function ExamQuestionsView({ exam }) {
  return (
    <ListGroup>
      {
        exam.questions?.map((question, idx) => (
          // eslint-disable-next-line react/no-array-index-key
          <ListGroup.Item key={idx}>
            {/* eslint-disable-next-line react/no-danger */}
            <div dangerouslySetInnerHTML={{ __html: question }} />
          </ListGroup.Item>
        ))
        }
    </ListGroup>
  );
}

ExamQuestionsView.propTypes = {
  exam: MPropTypes.objectOrObservableObject.isRequired,
};

export default observer(ExamQuestionsView);
