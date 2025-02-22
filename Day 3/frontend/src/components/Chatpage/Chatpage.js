import React, { useState } from "react";
import { ChatState } from "../../Context/ChatProvider";
import { Box, useMediaQuery, Spinner } from "@chakra-ui/react";
import MyChats from "../LeftChat/MyChats";
import ChatBox from "../RightPage/ChatBox";

const Chatpage = () => {
  const { user } = ChatState();
  const [fetchAgain, setFetchAgain] = useState(false);
  const [clicked, setClicked] = useState("Messages");
  const [switchTab, setSwitchTab] = useState(false);
  const [isLargerThan800] = useMediaQuery("(min-width: 900px)");

  if (!user) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" h="100vh">
        <Spinner size="xl" />
      </Box>
    );
  }

  return (
    <Box w="100%" h="100vh" overflowX="hidden" overflowY="hidden">
      <Box h="100vh" w="100%" display="flex" justifyContent="space-around">
        <MyChats
          fetchAgain={fetchAgain}
          switchTab={switchTab}
          setSwitchTab={setSwitchTab}
          setFetchAgain={setFetchAgain}
          clicked={clicked}
          setClicked={setClicked}
        />
        <ChatBox
          fetchAgain={fetchAgain}
          switchTab={switchTab}
          setSwitchTab={setSwitchTab}
          setFetchAgain={setFetchAgain}
        />
      </Box>
    </Box>
  );
};

export default Chatpage;