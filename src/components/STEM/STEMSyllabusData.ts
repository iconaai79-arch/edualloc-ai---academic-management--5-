export interface STEMMission {
    id: string;
    title: string;
    subtitle: string;
    gradeLevel: 'Grade 1-3' | 'Grade 4-6' | 'Grade 7-8';
    unitNumber: number;
    termNumber: number;
    storyDescription: string;
    audioNarrationText: string;
    learningOutcome: string;
    targetStarPosition?: { x: number; y: number }; // For 2D grid/canvas
    gridDimensions?: { rows: number; cols: number };
    startPosition?: { x: number; y: number; direction: 'RIGHT' | 'DOWN' | 'LEFT' | 'UP' };
    obstacles?: { x: number; y: number }[];
    hintText: string;
    xpReward: number;
    starterBlocks?: string[];
    teacherQuizQuestions?: {
        question: string;
        options: string[];
        correctIndex: number;
        explanation: string;
    }[];
}

export const STEM_SYLLABUS_MISSIONS: STEMMission[] = [
    // 🐣 GRADE 1 - 3 MISSIONS (Picture Blocks / Grid Board)
    {
        id: 'g1_m1',
        title: '🚀 Mission 1: First Steps of Rover',
        subtitle: 'Basic Directions & Sequencing',
        gradeLevel: 'Grade 1-3',
        unitNumber: 1,
        termNumber: 1,
        storyDescription: 'Welcome young Explorer! Rover Bot needs your help to reach the Energy Star. Drag the Step Forward block to move 2 steps ahead!',
        audioNarrationText: 'Welcome young Explorer! Rover Bot needs your help to reach the Energy Star. Tap the Move Forward button twice to reach the star!',
        learningOutcome: 'Understand directional sequences and basic 1:1 movement commands.',
        gridDimensions: { rows: 4, cols: 5 },
        startPosition: { x: 0, y: 1, direction: 'RIGHT' },
        targetStarPosition: { x: 2, y: 1 },
        obstacles: [{ x: 1, y: 0 }, { x: 1, y: 2 }],
        hintText: 'Drag two MOVE FORWARD ➡️ blocks to reach the Star!',
        xpReward: 100,
        starterBlocks: ['FORWARD'],
        teacherQuizQuestions: [
            {
                question: 'What happens when you give a robot 2 Move Forward commands?',
                options: ['It moves forward 2 steps', 'It turns in circles', 'It turns off'],
                correctIndex: 0,
                explanation: 'Sequence commands execute one after another in order.'
            }
        ]
    },
    {
        id: 'g1_m2',
        title: '↪️ Mission 2: Corner Turn Master',
        subtitle: 'Changing Direction & Angles',
        gradeLevel: 'Grade 1-3',
        unitNumber: 2,
        termNumber: 1,
        storyDescription: 'There is a wall ahead! Rover Bot needs to move 2 steps forward, turn right, and step forward to grab the Crystal.',
        audioNarrationText: 'Watch out for the asteroid wall! Guide Rover forward, then turn right to collect the space crystal.',
        learningOutcome: 'Combine movement and directional rotation blocks.',
        gridDimensions: { rows: 4, cols: 5 },
        startPosition: { x: 0, y: 0, direction: 'RIGHT' },
        targetStarPosition: { x: 2, y: 2 },
        obstacles: [{ x: 3, y: 0 }, { x: 0, y: 1 }],
        hintText: 'Move Forward ➡️, Move Forward ➡️, Turn Right ↪️, Move Forward ➡️!',
        xpReward: 150,
        starterBlocks: ['FORWARD', 'TURN_RIGHT'],
        teacherQuizQuestions: [
            {
                question: 'If Rover turns Right from facing Right, which direction does it face?',
                options: ['Facing Down', 'Facing Left', 'Facing Up'],
                correctIndex: 0,
                explanation: 'Turning right from facing East/Right turns the robot South/Down.'
            }
        ]
    },
    {
        id: 'g1_m3',
        title: '🔄 Mission 3: Repeat Loop Power',
        subtitle: 'Loops & Efficiency',
        gradeLevel: 'Grade 1-3',
        unitNumber: 3,
        termNumber: 2,
        storyDescription: 'Instead of putting 4 Move Forward blocks, use the REPEAT loop to step 4 times automatically!',
        audioNarrationText: 'Save energy with loops! Use a Repeat 4 times block to zoom straight across the grid.',
        learningOutcome: 'Master repeat loops to optimize code length.',
        gridDimensions: { rows: 4, cols: 5 },
        startPosition: { x: 0, y: 2, direction: 'RIGHT' },
        targetStarPosition: { x: 4, y: 2 },
        obstacles: [{ x: 2, y: 1 }, { x: 2, y: 3 }],
        hintText: 'Place a Repeat 4 block with Move Forward inside!',
        xpReward: 200,
        starterBlocks: ['REPEAT_3', 'FORWARD'],
        teacherQuizQuestions: [
            {
                question: 'Why do we use Loops in robotics?',
                options: ['To repeat actions easily without writing many blocks', 'To make the robot slow down', 'To erase code'],
                correctIndex: 0,
                explanation: 'Loops reduce code duplication and make robot programs efficient.'
            }
        ]
    },

    // 🚀 GRADE 4 - 6 MISSIONS (Word Scratch Blocks + Obstacle Avoidance)
    {
        id: 'g4_m1',
        title: '🤖 Mission 4: Ultrasonic Maze Runner',
        subtitle: 'If/Else Sensors & Distance Detection',
        gradeLevel: 'Grade 4-6',
        unitNumber: 1,
        termNumber: 1,
        storyDescription: 'The robot is in a continuous arena! Program it to drive forward until its Ultrasonic Distance Sensor detects an obstacle within 15 cm, then turn left.',
        audioNarrationText: 'Program the Ultrasonic Distance Sensor! If distance is less than 15 centimeters, turn left to avoid hitting the wall.',
        learningOutcome: 'Implement conditional decision-making using distance sensors.',
        hintText: 'Use `IF distance < 15 THEN Turn Left ELSE Move Forward`!',
        xpReward: 300,
        starterBlocks: ['FOREVER', 'IF_DISTANCE_LESS', 'MOVE_FORWARD', 'TURN_LEFT'],
        teacherQuizQuestions: [
            {
                question: 'Which sensor measures distance using sound waves?',
                options: ['Ultrasonic Distance Sensor', 'Light Sensor', 'Temperature Sensor'],
                correctIndex: 0,
                explanation: 'Ultrasonic sensors emit high-frequency sound waves and measure the bounce-back echo time.'
            }
        ]
    },
    {
        id: 'g4_m2',
        title: '🏎️ Mission 5: Autonomous Line Tracker',
        subtitle: 'Dual IR Line Followers & Loops',
        gradeLevel: 'Grade 4-6',
        unitNumber: 2,
        termNumber: 2,
        storyDescription: 'Program the robot to follow the black track line automatically using left and right Infrared (IR) line sensors.',
        audioNarrationText: 'Activate the Dual IR Line Followers! If Left Sensor detects black line, turn left. If Right Sensor detects black line, turn right.',
        learningOutcome: 'Build an autonomous closed-loop line tracking controller.',
        hintText: 'Check Left IR and Right IR sensor inputs inside a Forever loop!',
        xpReward: 400,
        starterBlocks: ['FOREVER', 'IF_IR_LEFT_BLACK', 'TURN_LEFT', 'IF_IR_RIGHT_BLACK', 'TURN_RIGHT', 'MOVE_FORWARD'],
        teacherQuizQuestions: [
            {
                question: 'How do Infrared (IR) line sensors detect a dark line?',
                options: ['Dark surfaces absorb light while white surfaces reflect light back', 'IR sensors measure sound', 'IR sensors measure weight'],
                correctIndex: 0,
                explanation: 'Black surfaces absorb infrared light reflection, producing a low reflection voltage signal.'
            }
        ]
    },

    // ⚡ GRADE 7 - 8 MISSIONS (Python & Micro:bit / Arduino Hardware IDE)
    {
        id: 'g7_m1',
        title: '⚡ Mission 6: Autonomous Mars Rover (Python + Micro:bit)',
        subtitle: 'Python Syntax, Variables & Hardware Export',
        gradeLevel: 'Grade 7-8',
        unitNumber: 1,
        termNumber: 1,
        storyDescription: 'Write a Python script for the Mars Rover to scan environment obstacles with ultrasonic sensors, calculate speed variables, and transmit radio telemetry.',
        audioNarrationText: 'Welcome to Advanced Python Robotics! Write Python functions and compile code directly for Micro:bit and Arduino controllers.',
        learningOutcome: 'Convert block logic to Python code and compile firmware for hardware targets.',
        hintText: 'Inspect the generated Python script side-by-side with your logic blocks!',
        xpReward: 500,
        starterBlocks: ['PYTHON_DEF_SCAN', 'WHILE_TRUE', 'READ_ULTRASONIC_CM', 'MICROBIT_RADIO_SEND'],
        teacherQuizQuestions: [
            {
                question: 'In Python robotics code, what keyword defines a function?',
                options: ['def', 'func', 'function'],
                correctIndex: 0,
                explanation: 'In Python, functions are declared using the `def` keyword.'
            }
        ]
    }
];
