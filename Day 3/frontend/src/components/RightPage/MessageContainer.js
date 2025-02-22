import React, { useEffect, useState, useRef } from "react";
import ScrollableFeed from "react-scrollable-feed";
import {
  Button,
  useToast,
  Input,
  Spinner,
  InputGroup,
  Box,
  InputRightElement,
} from "@chakra-ui/react";
import { ChatState } from "../../Context/ChatProvider";
import axios from "axios";
import MessageItem from "./MessageItem";
import io from "socket.io-client";
import Lottie from "react-lottie";
import animationData from "../animation/Animation.json";
const ENDPOINT = "http://localhost:5000";

// var socket, selectedChatCompare;

const MessageContainer = ({ fetchAgain, setFetchAgain }) => {
  const [messages, setMessages] = useState([]);
  const [image, setImage] = useState("");
  const [newmessage, setnewMessage] = useState("");
  const [loading, setloading] = useState(false);
  const [socket, setSocket] = useState(null);
  const { user, selectedChat, Notification, setNotification } = ChatState();
  const toast = useToast();
  const [socketConnected, setsocketConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const selectedChatCompare = useRef();

  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: animationData,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };

  const hiddenFileInput = useRef(null);

  const handleClick = () => {
    hiddenFileInput.current.click();
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5000000) { // 5MB limit
        toast({
          title: "File too large",
          description: "Please select an image under 5MB",
          status: "error",
          duration: 3000,
          position: "bottom",
        });
        return;
      }
      setFileTobase(file);
    }
  };

  const setFileTobase = (file) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setImage(reader.result);
    };
  };

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(ENDPOINT);
    setSocket(newSocket);

    return () => {
      if (newSocket) newSocket.close();
    };
  }, []);

  // Handle socket events
  useEffect(() => {
    if (!socket) return;

    socket.emit("setup", user.user);
    socket.on("connected", () => setsocketConnected(true));
    socket.on("typing", () => setIsTyping(true));
    socket.on("stop-typing", () => setIsTyping(false));

    return () => {
      socket.off("connected");
      socket.off("typing");
      socket.off("stop-typing");
    };
  }, [socket, user]);

  const fetchMessages = async () => {
    if (!selectedChat) return;

    try {
      setloading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${user.authToken}`,
        },
      };

      const { data } = await axios.get(
        `/api/message/${selectedChat._id}`,
        config
      );

      setMessages(data);
      setloading(false);
      
      if (socket) {
        socket.emit("join chat", selectedChat._id);
      }
    } catch (error) {
      toast({
        title: "Error occurred!",
        description: error.response?.data?.message || "Failed to load messages",
        status: "error",
        duration: 2000,
        position: "bottom",
      });
      setloading(false);
    }
  };

  const sendMessage = async () => {
    if (!newmessage && !image) {
      toast({
        title: "Please enter a message",
        status: "warning",
        duration: 2000,
        position: "bottom",
      });
      return;
    }
  
    try {
      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.authToken}`,
        },
      };
  
      setnewMessage("");
      setImage("");
  
      const { data } = await axios.post(
        "/api/message",
        {
          chatId: selectedChat._id,
          content: newmessage,
          image: image
        },
        config
      );
  
      if (data) {
        socket?.emit("new message", data);
        setMessages([...messages, data]);
      }
    } catch (error) {
      toast({
        title: "Failed to send message",
        description: "Please try again",
        status: "error",
        duration: 3000,
        position: "bottom",
      });
    }
  };
  // Message listener effect
  useEffect(() => {
    if (!socket) return;

    const messageHandler = (newMessageReceived) => {
      if (
        !selectedChatCompare.current ||
        selectedChatCompare.current._id !== newMessageReceived.Chat._id
      ) {
        if (!Notification.includes(newMessageReceived)) {
          setNotification([newMessageReceived, ...Notification]);
          setFetchAgain(!fetchAgain);
        }
      } else {
        setMessages((prev) => [...prev, newMessageReceived]);
      }
    };

    socket.on("message received", messageHandler);

    return () => {
      socket.off("message received", messageHandler);
    };
  },  [socket, Notification, setNotification, fetchAgain, setFetchAgain])

  // Update selected chat reference
  useEffect(() => {
    selectedChatCompare.current = selectedChat;
    if (selectedChat) {
      fetchMessages();
    }
  }, [selectedChat, user?.authToken]); 

  const typingHandler = (e) => {
    setnewMessage(e.target.value);

    if (!socketConnected) return;

    if (!typing) {
      setTyping(true);
      socket?.emit("typing", selectedChat._id);
    }

    const lastTypingTime = new Date().getTime();
    const timerLength = 3000;
    
    setTimeout(() => {
      const timeNow = new Date().getTime();
      const timeDiff = timeNow - lastTypingTime;

      if (timeDiff >= timerLength && typing) {
        socket?.emit("stop-typing", selectedChat._id);
        setTyping(false);
      }
    }, timerLength);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };


  return (
    <>
      <Box overflowY="scroll" p="1rem" pt="5rem" mb="12vh">
        <ScrollableFeed className="my-scrollable-feed">
          {loading ? (
            <Spinner alignSelf="Center" size="xl" />
          ) : (
            <MessageItem messages={messages} />
          )}
          {isTyping ? (
            <div
              style={{
                marginBottom: 15,
                marginLeft: 0,
                width: "70px",
              }}
            >
              {" "}
              <Lottie options={defaultOptions} width={70} /> Typing....
            </div>
          ) : null}
        </ScrollableFeed>
      </Box>
      <Box
        w="100%"
        h="100px"
        bgColor="transparent"
        gap="1rem"
        display="flex"
        justifyContent="center"
        position={"absolute"}
        bottom={0}
      >
        <InputGroup w="60%" h="100%" mt="1rem" gap="1rem" display="flex">
          <Input
            w="100%"
            h="60%"
            bgColor="#edede9"
            type="text"
            placeholder="Enter the message......."
            value={newmessage}
            onChange={typingHandler}
            onKeyDown={handleKeyPress}
          />
          <InputRightElement width="4.5rem" alignSelf="center" h="60%">
            <Button
              h="3rem"
              w="3rem"
              bgColor={"transparent"}
              borderRadius="50%"
              onClick={handleClick}
            >
              <i style={{ fontSize: "30px" }} className="fas fa-paperclip"></i>
            </Button>
            <Input
              ref={hiddenFileInput}
              accept="image/*"
              onChange={handleImage}
              type="file"
              hidden
            />
          </InputRightElement>
        </InputGroup>
        <Button
          h="3.5rem"
          alignSelf={"center"}
          _hover={{ bg: "#48cae4" }}
          bgColor="#0096c7"
          display={"flex"}
          gap={"1rem"}
          color={"white"}
          fontSize={"20px"}
          onClick={() => {
            sendMessage();
          }}
        >
          <i style={{ color: "white" }} className="fas fa-paper-plane"></i>
          send
        </Button>
      </Box>
    </>
  );
};

export default MessageContainer;
