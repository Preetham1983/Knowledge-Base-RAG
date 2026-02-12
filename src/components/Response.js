import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Response.css';

const Response = ({ userQuestion }) => {
  const [finalAnswer, setFinalAnswer] = useState("");
  const [retrievedContext, setRetrievedContext] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!userQuestion || userQuestion.trim() === "") {
      setFinalAnswer("");
      setRetrievedContext("");
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setFinalAnswer("");
      setRetrievedContext("");

      try {
        const res = await axios.post(
          "http://127.0.0.1:5000/process-query",
          { user_question: userQuestion }
        );

        // Backend returns:
        // generated_response = Gemini final answer
        // retrieved_context = PDF text
        setFinalAnswer(res.data.generated_response);
        setRetrievedContext(res.data.retrieved_context);

      } catch (error) {
        console.error("Error fetching response:", error);
        setFinalAnswer("❌ Error: Unable to fetch response. Check backend.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userQuestion]);

  return (
    <div className="chat-interface">
      {/* User Question Block */}
      <div className="user-question-block">
        <div className="avatar user-avatar">👤</div>
        <div className="message-bubble user-bubble">
          <strong>You:</strong>
          <p>{userQuestion}</p>
        </div>
      </div>

      {/* AI Response Block */}
      <div className="ai-response-block">
        <div className="avatar ai-avatar">🤖</div>
        <div className="message-bubble ai-bubble">
          <strong>AI:</strong>
          {isLoading ? (
            <div className="loading-dots">
              <span>.</span><span>.</span><span>.</span>
            </div>
          ) : (
            <pre className="response-text">
              {finalAnswer || "Thinking about your question..."}
            </pre>
          )}
        </div>
      </div>
      {/* Optional Context Section */}
      {retrievedContext && (
        <div className="context-section">
          <h3>📄 Retrieved PDF Context</h3>
          <pre className="context-display">{retrievedContext}</pre>
        </div>
      )}
    </div>
  );
};

export default Response;
