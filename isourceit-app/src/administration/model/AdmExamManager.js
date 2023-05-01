import { makeAutoObservable, runInAction } from 'mobx';
import {
  getExamSummary, updateExam, createExam, getAppAvailableChats, clearReports,
} from './netLayer';
import AdmExam from './AdmExam';

class AdmExamManager {
  _examsSummary = null;

  _currentExam = null;

  _availableChats = null;

  _loading = 0;

  _loadingError = null;

  constructor() {
    makeAutoObservable(this);
  }

  get examsSummary() {
    return this._examsSummary ?? [];
  }

  get currentExam() {
    return this._currentExam;
  }

  get availableChats() {
    return this._availableChats;
  }

  get loading() {
    return this._loading > 0;
  }

  get loadingError() {
    return this._loadingError;
  }

  async loadExamsSummary({ force = false }) {
    if (this._examsSummary && !force) {
      return this._examsSummary;
    }
    this._loading += 1;
    try {
      const examsSumData = await getExamSummary();
      runInAction(() => {
        this._examsSummary = examsSumData.map((exam) => new AdmExam(exam));
      });
      return this._examsSummary;
    } catch (e) {
      runInAction(() => {
        this._loadingError = e;
      });
      return null;
    } finally {
      runInAction(() => {
        this._loading -= 1;
      });
    }
  }

  async loadDetailedExam({ examId, force = false }) {
    if (this._currentExam && this.currentExam.detailsLoaded && !force) {
      return this._currentExam;
    }
    this._currentExam = null;
    let exam = this._examsSummary?.find((e) => e.id === examId);
    if (!exam) {
      exam = AdmExam.createEmptyExamWithId(examId);
    }
    this._loading += 1;
    try {
      await exam.loadDetails();
      runInAction(() => {
        this._currentExam = exam;
      });
      return exam;
    } catch (e) {
      runInAction(() => {
        this._loadingError = e;
      });
      return null;
    } finally {
      runInAction(() => {
        this._loading -= 1;
      });
    }
  }

  async loadAvailableChats() {
    if (this._availableChats) {
      return this._availableChats;
    }
    this._loading += 1;
    try {
      const availableChats = await getAppAvailableChats();
      runInAction(() => {
        this._availableChats = availableChats;
      });
      return availableChats;
    } catch (e) {
      runInAction(() => {
        this._loadingError = e;
      });
      return null;
    } finally {
      runInAction(() => {
        this._loading -= 1;
      });
    }
  }

  async saveExam(examJson) {
    this._loading += 1;
    try {
      if (examJson.id) {
        if (!this._currentExam || this._currentExam.id !== examJson.id) {
          throw new Error('Illegal state exception: attempt to update exam with wrong id or not current exam set');
        }
        // Update
        const examData = await updateExam({ exam: examJson });
        this._currentExam.fromJson(examData);
      } else {
        // Create
        const examData = await createExam({ exam: examJson });
        runInAction(() => {
          this._currentExam = new AdmExam(examData);
          if (this._examsSummary) {
            this._examsSummary.push(this._currentExam);
          }
        });
      }
      return this._currentExam;
    } catch (e) {
      runInAction(() => {
        this._loadingError = e;
      });
      return null;
    } finally {
      runInAction(() => {
        this._loading -= 1;
      });
    }
  }

  static async clearReports() {
    await clearReports();
  }
}

export default AdmExamManager;
