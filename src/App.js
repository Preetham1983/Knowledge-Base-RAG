// import React, { useState } from 'react';
// import FileUpload from './components/FileUpload';
// import QueryForm from './components/QueryForm';
// import Response from './components/Response';
// import QueryList from './components/QueryList'; 
// import './App.css';

// function App() {
//   const [userQuestion, setUserQuestion] = useState('');
//   const [responseLanguage, setResponseLanguage] = useState('en');

//   return (
//     <div>
//       <div className="navbar">
//         <h1>Chat With Author <span role="img" aria-label="chat">🤖</span></h1>
//       </div>
//       <div className='content-container'>
//         <FileUpload />
//         {userQuestion && <Response userQuestion={userQuestion} responseLanguage={responseLanguage}/>}
//         <QueryForm setUserQuestion={setUserQuestion} setResponseLanguage={setResponseLanguage} />
//         {/* <QueryList />  */}
//       </div>
//     </div>
//   );
// }

// export default App;

import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import QueryForm from './components/QueryForm';
import Response from './components/Response';
import './App.css';


function App() {
  const [userQuestion, setUserQuestion] = useState('');
  const [responseLanguage, setResponseLanguage] = useState('en');

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-content">
          <h1>Knowledge Base RAG <span role="img" aria-label="chat" className="header-icon">🤖</span></h1>
          <p className="header-subtitle">Intelligent PDF Analysis & Q&A</p>
        </div>
      </header>

      <main className='main-content'>
        <div className="content-wrapper">
          <section className="upload-section">
            <FileUpload />
          </section>

          <section className="response-section">
            <Response
              userQuestion={userQuestion}
              responseLanguage={responseLanguage}
            />
          </section>

          <section className="query-section">
            <QueryForm
              setUserQuestion={setUserQuestion}
              setResponseLanguage={setResponseLanguage}
            />
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
