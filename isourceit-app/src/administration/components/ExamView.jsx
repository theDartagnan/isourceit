import { observer } from 'mobx-react';
import React, { useContext, useEffect, useState } from 'react';
import {
  Button, ButtonGroup, Col, Row,
} from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBackward } from '@fortawesome/free-solid-svg-icons';
import ExamMgmtStore from './ExamMgmtStore';
import { AdvancedLoading } from '../../common/components/Loading';
import ExamInfoView from './examInfo/ExamInfoView';
import ExamQuestionsView from './examInfo/ExamQuestionsView';
import ExamStudentsView from './examInfo/ExamStudentsView';
import ReportArchiveModal from './examInfo/ReportArchiveModal';

function ExamView() {
  const navigate = useNavigate();
  const { examId } = useParams();
  const { manager } = useContext(ExamMgmtStore);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    manager.loadDetailedExam({ examId });
  }, [manager, examId]);

  const generatePdf = () => setShowReportModal(true);

  const editExam = () => {
    navigate('edit');
  };

  const exam = manager.currentExam;

  return (
    <Row className="justify-content-center">
      <Col xs={12} sm={12} md={12} lg={10}>
        <AdvancedLoading
          loading={manager.loading}
          loadingError={manager.loadingError}
        >
          {
            exam && (
              <>
                <Row className="justify-content-around">
                  <Col xs={12} md={5} xl={4}>
                    <h4 className="text-primary">
                      <Button as={Link} to={-1} variant="outline-primary" className="me-2" size="sm">
                        <FontAwesomeIcon aria-hidden="true" icon={faBackward} title="asked access" />
                      </Button>
                      {exam.name}
                    </h4>
                    <ExamInfoView exam={exam} />
                  </Col>
                  <Col xs={12} md={5} xl={4}>
                    <h4 className="text-primary">Questions</h4>
                    <ExamQuestionsView exam={exam} />
                  </Col>
                  <Col xs={12} md={2} xl={2}>
                    <h4 className="text-primary">Actions</h4>
                    <ButtonGroup vertical>
                      <Button as={Link} to="analytics" variant="success">Show analytics panel</Button>
                      <Button onClick={generatePdf} variant="primary">Generate PDF report</Button>
                      <Button disabled={!exam.editable} variant="warning" onClick={editExam}>Edit</Button>
                    </ButtonGroup>
                  </Col>
                </Row>
                <Row className="justify-content-around">
                  <Col>
                    <h4>Students</h4>
                    <ExamStudentsView exam={exam} />
                  </Col>
                </Row>
                <ReportArchiveModal
                  examId={exam.id}
                  show={showReportModal}
                  onClose={() => setShowReportModal(false)}
                />
              </>
            )
          }

        </AdvancedLoading>
      </Col>
    </Row>
  );
}

export default observer(ExamView);
