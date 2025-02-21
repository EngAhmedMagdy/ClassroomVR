import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useWebSocket } from "../hooks/useWebSocket"; // Import WebSocket hook

const VirtualClassroom = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const teacherRef = useRef<THREE.Object3D | null>(null);
  const keys = useRef({ w: false, a: false, s: false, d: false });
  const cameraAngle = useRef(0); // Track camera rotation
  const isDragging = useRef(false);
  const lastMouseX = useRef(0);
  //const { socket, students } = useWebSocket(); // Get WebSocket connection

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    // Camera setup (slightly higher & zoomed)
    const camera = new THREE.PerspectiveCamera(
      60, // Lower FOV for a more natural, immersive view
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    
    // Position camera behind and slightly above the avatar
    camera.position.set(0, 3, 8); // Higher (y = 3), farther (z = 8)
  
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    mountRef.current.appendChild(renderer.domElement);


    // Updated Walls to match 50x50 floor
    const walls = [
      { position: [0, 2, -25], size: [50, 4, 0.1] }, // Back Wall
      { position: [0, 2, 25], size: [50, 4, 0.1] },  // Front Wall
      { position: [-25, 2, 0], size: [0.1, 4, 50] }, // Left Wall
      { position: [25, 2, 0], size: [0.1, 4, 50] },  // Right Wall
    ];

    walls.forEach(({ position, size }) => {
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(...size),
        new THREE.MeshStandardMaterial({ color: 0xffffff })
      );
      const [x, y, z] = position;
      wall.position.set(x, y, z);
      scene.add(wall);
    });




    // Whiteboard
    // Create a canvas for the whiteboard texture
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height); // White background

        ctx.fillStyle = "black";
        ctx.font = "Bold 40px Arial";
        ctx.fillText("1 + 1 = 2", 150, 130); // Example equation
      }

      // Create a texture from the canvas
      const whiteboardTexture = new THREE.CanvasTexture(canvas);
    const whiteboard = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 4), // Slightly larger for better visibility
      new THREE.MeshStandardMaterial({ 
        map: whiteboardTexture,
        color: 0xffffff, // Pure white
        emissive: 0xffffff, // Makes it glow slightly
        emissiveIntensity: 0.2, // Adjust brightness (1 is good) })
      }));
    whiteboard.position.set(0, 2, -24.9); // Adjusted to be against the back wall
    whiteboard.rotation.y = 0; // Ensures it's facing forward
    scene.add(whiteboard);

      


    //end

    const createDeskGroup = (x: number, z: number) => {
      const group = new THREE.Group();
    
      // Desk
      const desk = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.1, 1), // Desk size
        new THREE.MeshStandardMaterial({ color: 0x654321 })
      );
      desk.position.set(0, 0.55, 0);
      group.add(desk);
    
      // Chair
      const chair = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 0.5), // Chair size
        new THREE.MeshStandardMaterial({ color: 0x333333 })
      );
      chair.position.set(0, 0.25, 0.8); // Move behind desk
      group.add(chair);
    
      // Position the whole group
      group.position.set(x, 0, z);
    
      // Rotate to face whiteboard (whiteboard at negative Z direction)
      group.rotation.y = 0;
    
      scene.add(group);
    };
    
    // Arrange desks in classroom rows, all facing whiteboard
    const rows = 10;
    const cols = 6;
    const deskSpacingX = 2.5; // Side spacing
    const deskSpacingZ = 3; // Front spacing
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = (col - cols / 2) * deskSpacingX;
        const z = row * -deskSpacingZ + 10; // Moves backward in rows
        createDeskGroup(x, z);
      }
    }
    



      // Lights
      const light = new THREE.AmbientLight(0xffffff, 0.7);
      scene.add(light);
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(5, 5, 5);
      scene.add(directionalLight);

      // Floor
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(50, 50),
        new THREE.MeshStandardMaterial({ color: 0x808080 })
      );
      floor.rotation.x = -Math.PI / 2;
      scene.add(floor);

      // Create Basic Robot
      const createRobot = () => {
        const robot = new THREE.Group();
        
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(1, 1.5, 0.5),
          new THREE.MeshStandardMaterial({ color: 0x00aaff })
        );
        body.position.set(0, 0.75, 0);
        robot.add(body);

        const head = new THREE.Mesh(
          new THREE.SphereGeometry(0.4, 16, 16),
          new THREE.MeshStandardMaterial({ color: 0xffaa00 })
        );
        head.position.set(0, 1.5, 0);
        robot.add(head);

        return robot;
      };

      // Add the robot to the scene
      const robot = createRobot();
      robot.position.set(0, 0, 0);
      scene.add(robot);
      teacherRef.current = robot;
      
      // Movement Controls
      const handleKeyDown = (e: KeyboardEvent) => {
      if (keys.current[e.key as keyof typeof keys.current] !== undefined) {
        keys.current[e.key as keyof typeof keys.current] = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (keys.current[e.key as keyof typeof keys.current] !== undefined) {
        keys.current[e.key as keyof typeof keys.current] = false;
      }
    };
    //camera control with mouse
      
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) { // Left-click
        isDragging.current = true;
        lastMouseX.current = e.clientX;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
        const deltaX = e.clientX - lastMouseX.current;
        cameraAngle.current -= deltaX * 0.005; // Adjust sensitivity
        lastMouseX.current = e.clientX;
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };
      
      // Attach mouse events
      window.addEventListener("mousedown", handleMouseDown);
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      
      //end 
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);

      // Animation Loop
      let animationFrameId: number;
      const speed = 0.1;
      const rotationSpeed = 0.03; // Camera rotation speed

      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);

        if (teacherRef.current) {
          const teacher = teacherRef.current;
          let movementDirection = new THREE.Vector3();

          // Handle Camera Rotation (A & D keys)
          if (keys.current.a) cameraAngle.current += rotationSpeed;
          if (keys.current.d) cameraAngle.current -= rotationSpeed;

          // Get correct forward direction
          const forward = new THREE.Vector3(
            -Math.sin(cameraAngle.current), // Inverted X
            0,
            -Math.cos(cameraAngle.current) // Inverted Z
          ).normalize();

          // Move forward/backward
          if (keys.current.w) movementDirection.add(forward);
          if (keys.current.s) movementDirection.add(forward.clone().negate());

          // Apply movement
          if (movementDirection.length() > 0) {
            movementDirection.normalize();
            teacher.position.addScaledVector(movementDirection, speed);

            // Rotate robot to face movement direction
            const targetRotation = Math.atan2(movementDirection.x, movementDirection.z);
            const targetQuaternion = new THREE.Quaternion();
            targetQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), targetRotation);
            teacher.quaternion.slerp(targetQuaternion, 0.1);
          }



          // Smooth Follow (Inside animate loop)
          const cameraOffset = new THREE.Vector3(0, 3, 8).applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraAngle.current);
          const targetCameraPosition = teacher.position.clone().add(cameraOffset);
          camera.position.lerp(targetCameraPosition, 0.1);
          
          // Make camera look slightly downward at the robot
          const lookAtPosition = teacher.position.clone().add(new THREE.Vector3(0, 1.5, 0));
          camera.lookAt(lookAtPosition);
        }

        renderer.render(scene, camera);
      };

      animate();

        // Cleanup Function
        return () => {
          window.removeEventListener("keydown", handleKeyDown);
          window.removeEventListener("keyup", handleKeyUp);
          mountRef.current?.removeChild(renderer.domElement);
          cancelAnimationFrame(animationFrameId);
          //controls.dispose();
        };
      }, []);

      return <div ref={mountRef} style={{ width: "100vw", height: "100vh" }} />;
    };

export default VirtualClassroom;
