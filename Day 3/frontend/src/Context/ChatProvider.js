import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const ChatContext = createContext();

const ChatProvider = ({ children }) => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [theme, setTheme] = useState(false);
  const [Notification, setNotification] = useState([]);
  const [chats, setChats] = useState([]);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem("userinfo"));
    setUser(userInfo);
  
    if (!userInfo) {
      navigate("/login");
    }
  }, [navigate]);

  return (
    <ChatContext.Provider
      value={{
        user,
        setUser,
        chats,
        setChats,
        selectedChat,
        setSelectedChat,
        Notification,
        setNotification,
        theme,
        setTheme,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const ChatState = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('ChatState must be used within a ChatProvider');
  }
  return context;
};

export default ChatProvider;