import { makeAutoObservable, runInAction } from 'mobx';
import StuExam from './StuExam';
import SocketManager from './SocketManager';

class StuExamManager {
  _exam;

  _loading = 0;

  _loadingError = null;

  _socketManager = null;

  constructor({
    examId, examStarted, examEnded, timeout,
  }) {
    makeAutoObservable(this);
    this._exam = new StuExam({
      id: examId,
      started: examStarted,
      ended: examEnded,
      timeout,
    });
    this._socketManager = new SocketManager();
    this._socketManager.answerCallback = (answer) => this._exam.handleChatAnswer(answer);
    this._init();
  }

  get exam() {
    return this._exam;
  }

  get loading() {
    return this._loading > 0;
  }

  get loadingError() {
    return this._loadingError;
  }

  get socketManager() {
    return this._socketManager;
  }

  async _init() {
    if (!this._exam.ended) {
      this._loading += 1;
      try {
        await this._exam.refresh();
      } catch (e) {
        runInAction(() => {
          this._loadingError = e;
        });
      } finally {
        runInAction(() => {
          this._loading -= 1;
        });
      }
    }
  }
}

export default StuExamManager;
