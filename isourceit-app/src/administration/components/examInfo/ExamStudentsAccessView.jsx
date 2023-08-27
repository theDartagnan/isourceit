import { observer, PropTypes as MPropTypes } from 'mobx-react';
import React, { useState } from 'react';
import {
  Button, OverlayTrigger, Table, Tooltip,
} from 'react-bootstrap';

function ExamStudentsAccessView({ exam }) {
  const [accessLoading, setAccessLoading] = useState(false);
  const [showSharedLinkTooltip, setShowSharedLinkTooltip] = useState(-1);

  const loadAuthentications = () => {
    if (!accessLoading) {
      setAccessLoading(true);
      exam.generateStudentAuthentications().finally(() => {
        setAccessLoading(false);
      });
    }
  };

  const shareLinkToClipboard = (url, idx) => {
    navigator.clipboard.writeText(url).then(() => {
      setShowSharedLinkTooltip(idx);
    });
  };

  const onToogleTooltip = () => {
    setTimeout(() => setShowSharedLinkTooltip(-1), 1000);
  };

  if (!exam.studentAuthentications) {
    return (
      <Button variant="danger" disabled={accessLoading} onClick={loadAuthentications}>Generate and display student access URLs</Button>
    );
  }

  return (
    <Table responsive striped bordered hover size="sm" className="fittedTable">
      <thead>
        <tr>
          <th>Username</th>
          <th>Action</th>
          <th>Access URL</th>

        </tr>
      </thead>
      <tbody>
        {
          exam.studentAuthentications?.map((access, idx) => (
            <tr key={access.username}>
              <td>{access.username}</td>
              <td>
                <OverlayTrigger
                  trigger="click"
                  placement="right"
                  show={showSharedLinkTooltip && showSharedLinkTooltip[idx]}
                  onToggle={onToogleTooltip}
                  overlay={(<Tooltip id="shared-link-tooltip">Copied!</Tooltip>)}
                >
                  <Button variant="outline-secondary" id="share-student-link" onClick={() => shareLinkToClipboard(access.access_url, idx)}>
                    Share
                  </Button>
                </OverlayTrigger>
              </td>
              <td>{access.access_url}</td>
            </tr>
          ))
          }
      </tbody>
    </Table>
  );
}

ExamStudentsAccessView.propTypes = {
  exam: MPropTypes.objectOrObservableObject.isRequired,
};

export default observer(ExamStudentsAccessView);
