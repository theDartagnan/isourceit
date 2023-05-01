import React from 'react';
import { RouterProvider, createBrowserRouter, redirect } from 'react-router-dom';
import STORE from './store';
import RootStore from './RootStore';
import Root from './common/components/Root';
import AdministrativeLogin from './common/components/login/AdministrativeLogin';
import StudentTokenGeneration from './common/components/login/StudentTokenGeneration';
import ExamsViewTable from './administration/components/ExamsViewTable';
import ExamsManagement from './administration/components/ExamsManagement';
import ExamView from './administration/components/ExamView';
import ExamAnalytics from './administration/components/examAnalytics/ExamAnalytics';
import ExamEditor from './administration/components/examEdition/ExamEditor';
import ExamRoot from './composition/components/ExamRoot';
import FatalError from './common/components/FatalError';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    errorElement: <FatalError />,
    children: [
      {
        index: true,
        element: <div>...</div>,
        loader: async () => {
          const { currentUser } = STORE;
          await currentUser.getInitPromise();
          if (currentUser.loggedIn) {
            if (currentUser.isStudent) {
              if (currentUser.context?.examId) {
                throw redirect('/composition/exam');
              }
              throw new Error('Bad application state');
            } else if (currentUser.isTeacherOrAdmin) {
              throw redirect('/administrative/exams');
            } else {
              throw new Error('Bad application state');
            }
          } else {
            throw redirect('/login');
          }
        },
      },
      {
        path: 'login',
        element: <AdministrativeLogin />,
        loader: async () => {
          const { currentUser } = STORE;
          await currentUser.getInitPromise();
          if (currentUser.loggedIn) {
            throw redirect('/');
          }
          return true;
        },
      },
      {
        path: 'composition/auth',
        loader: async () => {
          const { currentUser } = STORE;
          await currentUser.getInitPromise();
          if (currentUser.loggedIn) {
            throw redirect('/');
          }
          return true;
        },
        children: [
          {
            path: 'generation/:examId',
            element: <StudentTokenGeneration />,
          },
          {
            path: 'validation',
            element: <div>...</div>,
            loader: async ({ request }) => {
              const { currentUser } = STORE;
              const url = new URL(request.url);
              const ticket = url.searchParams.get('ticket');
              await currentUser.ticketAuth({ ticket });
              throw redirect('/');
            },
          },
        ],
      },
      {
        path: 'administrative',
        loader: async () => {
          const { currentUser } = STORE;
          await currentUser.getInitPromise();
          if (!currentUser.loggedIn || !currentUser.isTeacherOrAdmin) {
            throw redirect('/');
          }
          return true;
        },
        children: [
          {
            index: true,
            loader: async () => {
              throw redirect('/administrative/exams');
            },
          },
          {
            path: 'exams',
            element: <ExamsManagement />,
            children: [
              {
                index: true,
                element: <ExamsViewTable />,
              },
              {
                path: 'new',
                element: <ExamEditor newExam />,
              },
              {
                path: ':examId',
                element: <ExamView />,
              },
              {
                path: ':examId/edit',
                element: <ExamEditor />,
              },
              {
                path: ':examId/analytics',
                element: <ExamAnalytics />,
              },
            ],
          },
        ],
      },
      {
        path: 'composition/exam',
        loader: async () => {
          const { currentUser } = STORE;
          await currentUser.getInitPromise();
          if (!currentUser.loggedIn || !currentUser.isStudent || !currentUser.context?.examId) {
            throw redirect('/');
          }
          return true;
        },
        element: <ExamRoot />,
      },
      {
        path: 'not-ready',
        element: <div>NOT READY</div>,
      },
    ],
  },
], {
  basename: APP_ENV_APP_PUBLIC_PATH,
});

function App() {
  return (
    <RootStore.Provider value={STORE}>
      <RouterProvider router={router} />
    </RootStore.Provider>
  );
}

export default App;
