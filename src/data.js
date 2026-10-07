const gh = 'https://github.com/Saikarthik-Ramakrishnan/';

export const profile = {
  name: 'Saikarthik Ramakrishnan',
  intro: 'Second-year Electrical and Computer Engineering student at Shiv Nadar Institution of Eminence, building at the intersection of hardware and software.',
  focus: 'FPGA logic | Edge computer vision | Simulation | Battery research',
  avatar: 'https://github.com/Saikarthik-Ramakrishnan.png',
  email: 'rsaik2606@gmail.com',
  github: 'https://github.com/Saikarthik-Ramakrishnan',
  linkedin: '#'
};

export const featured = {
  name: 'Cellular Automata FPGA Engine',
  tagline: 'A parallel cellular automaton engine running entirely in FPGA logic.',
  desc: 'A cellular automaton engine implemented in Verilog, with dedicated logic for each cell so the entire grid updates in parallel on an FPGA. It models systems such as forest-fire spread and is controlled and monitored through a browser console.',
  stack: 'Verilog | FPGA | cocotb | Tang Primer 20K',
  url: gh + 'ca-fpga-engine'
};

export const projects = [
  { name: 'CPCS: Passenger Counting', sim: 'cpcsDoor', tagline: 'Counting bus passengers from a single door camera.', desc: 'A computer-vision system that counts passengers boarding and leaving a bus from a single door camera. It runs on an onboard edge device and records trip data to a reporting dashboard.', stack: 'Python | Computer vision | Edge | Orange Pi 5', url: gh + 'cpcs-prototype' },
  { name: 'Darwin Board', sim: 'darwinCircuit', tagline: 'Analog hardware that calibrates itself.', desc: 'A self-calibrating analog hardware platform. It monitors its own output, optimizes its parameters in a closed loop, and recovers automatically from component faults.', stack: 'Python | ESP32 | Analog hardware', url: gh + 'darwin-board' },
  { name: 'Phantom: Traffic-Jam Simulator', sim: 'phantomRing', tagline: 'How stop-and-go waves form, and how one vehicle can dissolve them.', desc: 'An agent-based simulation of phantom traffic jams on a ring road, showing how a single autonomous vehicle can dampen stop-and-go waves. Calibrated for Indian mixed-vehicle traffic.', stack: 'JavaScript | Simulation | Web', url: gh + 'phantom-traffic' },
  { name: 'Phantom Evolve', sim: 'evolveRing', tagline: 'Evolutionary game theory for driving strategies.', desc: 'An extension of the Phantom simulator that applies evolutionary game theory to study how driving strategies compete and spread across a population.', stack: 'HTML | Game theory | Web', url: gh + 'phantom-evolve-gametheory' },
  { name: 'NeuroSensorOS LSM', sim: 'liquidState', tagline: 'Streaming change detection with a spiking liquid state machine.', desc: 'A research prototype that detects changes in streaming sensor data using a liquid state machine: a fixed 96-neuron spiking reservoir with a trained readout. On 64 held-out simulated subjects it reached 97.84% accuracy on noisy data.', stack: 'Python | NumPy | Spiking neural networks', url: gh + 'neurosensoros-lsm' },
  { name: 'Leakage Lens: Burn-in Screening', sim: 'burnIn', tagline: 'Spotting failing components from the first 24 hours of burn-in.', desc: 'Built for Smart India Hackathon problem SIH26170. Burn-in holds parts at high temperature and voltage for 168 h. Leakage Lens uses only the 0 h and 24 h leakage readings to flag parts drifting away from their batch, forecast the 168 h leakage with a calibrated interval, and rank each part as accept, monitor, retest or engineer review. On synthetic X7R capacitor data the forecast error is 13.6% of the limit, against 15.3% for carrying the 24 h reading forward.', stack: 'Python | XGBoost | FastAPI | React', url: gh + 'sih-burn-in-project' }
];

export const research = [
  { title: 'Behavioral Battery Index: Li-ion State-of-Health Estimation', status: 'In preparation | IEEE Access', desc: 'Feature engineering across the NASA PCoE and Oxford degradation datasets, with leave-one-cell-out validation, cross-dataset transfer, and a protocol-inflation audit.' }
];

export const experience = [
  { when: 'Jul 2026 – now', title: 'Engineering Intern, SPowerZ Solutions', short: 'Real-time passenger counting on edge hardware.', desc: 'Real-time computer-vision pipeline counting bus passengers from a doorway camera. Directional door-crossing logic on ByteTrack, deployed to Orange Pi 5 with SQLite logging and a reporting dashboard.' },
  { when: '2025 – 2029', title: 'Shiv Nadar Institution of Eminence', short: 'B.Tech, Electrical and Computer Engineering.', desc: "B.Tech, Electrical & Computer Engineering. CGPA 8.55 (Year 1). Dean's List, Monsoon 2025." },
  { when: 'Grades XI – XII', title: 'BVM Global, Perungudi', short: 'CBSE Class XII, 93%.', desc: 'CBSE Class XII: 93%. School topper in Artificial Intelligence (100%).' },
  { when: 'Grades V – X', title: 'Vaels International School', short: 'ICSE Class X, 96%.', desc: 'ICSE Class X: 96%. School 3rd rank in Science.' }
];

export const skills = [
  { group: 'Languages', items: 'Python, C, C++, Java, JavaScript, Verilog, MATLAB' },
  { group: 'ML & data', items: 'PyTorch, TensorFlow, scikit-learn, snnTorch, pandas, NumPy' },
  { group: 'Frameworks & tools', items: 'Flask, FastAPI, Streamlit, cocotb, Cython, RAG pipelines' },
  { group: 'Hardware', items: 'FPGA, Arduino, ESP32, sensor integration' }
];

export const awards = "Dean's List, Monsoon 2025 | School Topper, CBSE XII Artificial Intelligence | Coursera: Generative AI with Developers, Battery Technologies, Retrieval-Augmented Generation";
