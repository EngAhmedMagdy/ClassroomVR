import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

const SERVER_URL = "http://localhost:3001"; // Change this if hosting elsewhere

export const useWebSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [students, setStudents] = useState<{ id: string; position: { x: number; y: number; z: number } }[]>([]);

  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);

    // Listen for new students joining
    newSocket.on("students_update", (students) => {
      setStudents(students);
    });

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);

  return { socket, students };
};
