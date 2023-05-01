import { observer, PropTypes as MPropTypes } from 'mobx-react';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { useEffect, useRef } from 'react';
import {
  Alert, Col, Row,
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

function ChatAIMessageBox({ chatActions, submitting }) {
  const chatBoxRef = useRef();

  useEffect(() => {
    const chatMSgBox = chatBoxRef.current;
    if (chatMSgBox) {
      chatMSgBox.scrollTop = chatMSgBox.scrollHeight - chatMSgBox.clientHeight;
    }
  });

  const chatMessages = chatActions
    .flatMap((act) => (act.answer
      ? [{ k: `prompt-${act.id}`, v: act.prompt }, { k: `ans-${act.id}`, v: act.answer, a: true }]
      : [{ k: `prompt-${act.id}`, v: act.prompt }]));

  return (
    <Row
      className={classNames('border', 'border-dark-subtle', 'overflow-auto')}
      style={{
        minHeight: '20vh',
        maxHeight: '50vh',
      }}
      ref={chatBoxRef}
    >
      <Col>
        {
          chatMessages.map((msg) => (
            <Row key={msg.k} className={classNames({ 'justify-content-end': msg.a })}>
              <Col xs={7}>
                <Alert variant={msg.a ? 'success' : 'primary'}>
                  <p className="m-0" style={{ whiteSpace: 'pre-line' }}>{msg.v}</p>
                </Alert>
              </Col>
            </Row>
          ))
          }
        {
            submitting && (
              <Row className="justify-content-center" style={{ height: '2rem' }}>
                <Col xs="auto">
                  <FontAwesomeIcon icon={faSpinner} className={classNames('text-secondary-emphasis')} spinPulse size="xl" />
                </Col>
              </Row>
            )
          }
      </Col>
    </Row>
  );
}

ChatAIMessageBox.propTypes = {
  chatActions: MPropTypes.arrayOrObservableArray.isRequired,
  submitting: PropTypes.bool,
};

ChatAIMessageBox.defaultProps = {
  submitting: false,
};

export default observer(ChatAIMessageBox);
