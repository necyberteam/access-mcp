/**
 * Shared taxonomies and reference data for ACCESS-CI MCP servers
 * These provide context to AI assistants about the ACCESS-CI ecosystem
 */

export interface FieldOfScience {
  name: string;
  description: string;
  keywords: string[];
  typical_resources: string[];
  common_software: string[];
  allocation_range?: {
    min: number;
    max: number;
    typical: number;
  };
}

/**
 * NSF Field of Science classification with ACCESS-CI context
 * Based on NSF's formal classification system with added context about
 * typical resource usage patterns and software requirements
 */
export const FIELDS_OF_SCIENCE: Record<string, FieldOfScience> = {
  "Computer Science": {
    name: "Computer Science",
    description:
      "Research in algorithms, AI/ML, data science, cybersecurity, and high-performance computing",
    keywords: [
      "machine learning",
      "artificial intelligence",
      "deep learning",
      "neural networks",
      "data science",
      "algorithms",
      "distributed systems",
      "parallel computing",
      "HPC",
      "cybersecurity",
      "computer vision",
      "natural language processing",
      "NLP",
    ],
    typical_resources: ["GPU", "high memory", "fast storage", "high-speed networking"],
    common_software: [
      "TensorFlow",
      "PyTorch",
      "scikit-learn",
      "Python",
      "CUDA",
      "Jupyter",
      "NumPy",
      "Pandas",
    ],
    allocation_range: {
      min: 50000,
      max: 1000000,
      typical: 250000,
    },
  },

  "Biological Sciences": {
    name: "Biological Sciences",
    description:
      "Research in genomics, proteomics, structural biology, systems biology, and bioinformatics",
    keywords: [
      "genomics",
      "proteomics",
      "bioinformatics",
      "structural biology",
      "molecular dynamics",
      "sequence analysis",
      "protein folding",
      "phylogenetics",
      "systems biology",
      "metagenomics",
    ],
    typical_resources: ["high throughput", "large storage", "CPU clusters", "high memory"],
    common_software: [
      "BLAST",
      "GROMACS",
      "AMBER",
      "NAMD",
      "Rosetta",
      "Bowtie",
      "SAMtools",
      "BioPython",
    ],
    allocation_range: {
      min: 100000,
      max: 800000,
      typical: 300000,
    },
  },

  Physics: {
    name: "Physics",
    description:
      "Research in high energy physics, astrophysics, condensed matter, and computational physics",
    keywords: [
      "quantum mechanics",
      "particle physics",
      "astrophysics",
      "cosmology",
      "condensed matter",
      "computational physics",
      "molecular dynamics",
      "lattice QCD",
      "gravitational waves",
    ],
    typical_resources: ["CPU clusters", "high memory", "GPU for simulations", "large storage"],
    common_software: [
      "LAMMPS",
      "Quantum ESPRESSO",
      "VASP",
      "GROMACS",
      "ROOT",
      "Geant4",
      "MATLAB",
      "Mathematica",
    ],
    allocation_range: {
      min: 100000,
      max: 2000000,
      typical: 500000,
    },
  },

  Chemistry: {
    name: "Chemistry",
    description: "Research in computational chemistry, molecular modeling, and materials science",
    keywords: [
      "molecular dynamics",
      "quantum chemistry",
      "computational chemistry",
      "materials science",
      "drug discovery",
      "reaction mechanisms",
      "DFT",
      "ab initio",
    ],
    typical_resources: ["CPU clusters", "high memory", "GPU acceleration", "fast storage"],
    common_software: ["Gaussian", "GAMESS", "NWChem", "ORCA", "AMBER", "NAMD", "LAMMPS", "VMD"],
    allocation_range: {
      min: 75000,
      max: 1000000,
      typical: 300000,
    },
  },

  Engineering: {
    name: "Engineering",
    description:
      "Research in computational engineering, CFD, structural analysis, and design optimization",
    keywords: [
      "computational fluid dynamics",
      "CFD",
      "finite element analysis",
      "FEA",
      "structural analysis",
      "optimization",
      "CAD",
      "mechanical engineering",
      "aerospace",
    ],
    typical_resources: ["CPU clusters", "high memory", "GPU for visualization", "parallel I/O"],
    common_software: ["ANSYS", "OpenFOAM", "COMSOL", "ABAQUS", "LS-DYNA", "SU2", "ParaView"],
    allocation_range: {
      min: 100000,
      max: 1500000,
      typical: 400000,
    },
  },

  "Earth Sciences": {
    name: "Earth Sciences",
    description:
      "Research in climate modeling, atmospheric science, geophysics, and environmental science",
    keywords: [
      "climate modeling",
      "atmospheric science",
      "weather prediction",
      "oceanography",
      "geophysics",
      "seismology",
      "remote sensing",
      "environmental science",
    ],
    typical_resources: ["large storage", "CPU clusters", "high I/O", "data analytics"],
    common_software: ["WRF", "CESM", "NCAR", "netCDF", "GDAL", "Python", "R", "MATLAB"],
    allocation_range: {
      min: 150000,
      max: 2000000,
      typical: 600000,
    },
  },

  "Mathematics and Statistics": {
    name: "Mathematics and Statistics",
    description:
      "Research in numerical analysis, optimization, data analytics, and statistical modeling",
    keywords: [
      "numerical analysis",
      "optimization",
      "linear algebra",
      "statistics",
      "data analytics",
      "monte carlo",
      "stochastic processes",
      "computational mathematics",
    ],
    typical_resources: ["CPU clusters", "high memory", "GPU for linear algebra"],
    common_software: ["MATLAB", "R", "Python", "Julia", "Mathematica", "SAS", "SPSS", "Octave"],
    allocation_range: {
      min: 50000,
      max: 500000,
      typical: 150000,
    },
  },

  "Social Sciences": {
    name: "Social Sciences",
    description:
      "Research in economics, sociology, political science, and computational social science",
    keywords: [
      "econometrics",
      "agent-based modeling",
      "network analysis",
      "social networks",
      "political science",
      "computational social science",
      "survey analysis",
    ],
    typical_resources: ["data analytics", "storage", "CPU clusters for simulations"],
    common_software: ["R", "Python", "Stata", "SPSS", "NetLogo", "Gephi", "Julia"],
    allocation_range: {
      min: 25000,
      max: 300000,
      typical: 100000,
    },
  },

  "Astronomy and Astrophysics": {
    name: "Astronomy and Astrophysics",
    description: "Research in observational astronomy, cosmological simulations, and data analysis",
    keywords: [
      "cosmology",
      "galaxy formation",
      "stellar evolution",
      "exoplanets",
      "gravitational waves",
      "radio astronomy",
      "optical astronomy",
      "simulation",
    ],
    typical_resources: ["large storage", "CPU clusters", "GPU for visualization", "data pipelines"],
    common_software: ["Gadget", "FLASH", "Enzo", "Athena", "IRAF", "DS9", "Python", "astropy"],
    allocation_range: {
      min: 150000,
      max: 2500000,
      typical: 700000,
    },
  },
};

/**
 * ACCESS Allocation Types with definitions and typical use cases
 */
export interface AllocationType {
  name: string;
  description: string;
  typical_duration: string;
  credit_range: {
    min: number;
    max: number;
  };
  use_cases: string[];
  eligibility: string;
}

export const ALLOCATION_TYPES: Record<string, AllocationType> = {
  Discover: {
    name: "Discover ACCESS Credits",
    description:
      "Small allocations for exploring ACCESS resources and conducting preliminary research",
    typical_duration: "12 months",
    credit_range: {
      min: 1000,
      max: 400000,
    },
    use_cases: [
      "Preliminary research and feasibility studies",
      "Code development and testing",
      "Learning ACCESS systems",
      "Small-scale computational experiments",
      "Proof-of-concept work",
    ],
    eligibility: "All researchers at US institutions",
  },

  Explore: {
    name: "Explore ACCESS Credits",
    description: "Medium allocations for established research projects",
    typical_duration: "12 months",
    credit_range: {
      min: 400000,
      max: 1500000,
    },
    use_cases: [
      "Ongoing research projects",
      "Production computations",
      "Data analysis and processing",
      "Multi-parameter studies",
      "Medium-scale simulations",
    ],
    eligibility: "Researchers with demonstrated need beyond Discover level",
  },

  Accelerate: {
    name: "Accelerate ACCESS Credits",
    description: "Large allocations for significant computational research",
    typical_duration: "12 months",
    credit_range: {
      min: 1500000,
      max: 10000000,
    },
    use_cases: [
      "Large-scale simulations",
      "Major research initiatives",
      "High-throughput computing campaigns",
      "Big data analytics",
      "Multi-year projects",
    ],
    eligibility: "Well-established research programs with significant computational needs",
  },

  Maximize: {
    name: "Maximize ACCESS Credits",
    description: "Very large allocations for exceptional computational research with broad impact",
    typical_duration: "12 months",
    credit_range: {
      min: 10000000,
      max: 50000000,
    },
    use_cases: [
      "Grand challenge problems",
      "Transformative research",
      "National-scale computing campaigns",
      "Major scientific breakthroughs",
      "Leadership-class computing",
    ],
    eligibility: "Exceptional projects with demonstrated transformative potential and broad impact",
  },
};

/**
 * Common resource types and their characteristics
 */
export interface ResourceType {
  name: string;
  description: string;
  typical_use_cases: string[];
  key_features: string[];
}

export const RESOURCE_TYPES: Record<string, ResourceType> = {
  CPU: {
    name: "CPU Compute",
    description: "General-purpose computing with standard processors",
    typical_use_cases: [
      "Serial and parallel applications",
      "General scientific computing",
      "Data processing",
      "Simulations",
    ],
    key_features: ["High core counts", "Good memory bandwidth", "MPI support", "Long-running jobs"],
  },

  GPU: {
    name: "GPU Accelerated",
    description: "Systems with graphics processing units for accelerated computing",
    typical_use_cases: [
      "Machine learning and AI",
      "Deep learning",
      "Molecular dynamics",
      "Image processing",
      "CFD simulations",
    ],
    key_features: ["CUDA/ROCm support", "High memory bandwidth", "Tensor cores", "Fast training"],
  },

  "High Memory": {
    name: "High Memory Systems",
    description: "Systems with large RAM for memory-intensive applications",
    typical_use_cases: [
      "Large datasets in memory",
      "Genome assembly",
      "In-memory databases",
      "Large-scale graph analysis",
    ],
    key_features: ["1TB+ memory per node", "Fast memory access", "Large working sets"],
  },

  Storage: {
    name: "Storage Resources",
    description: "High-capacity storage systems for data-intensive research",
    typical_use_cases: [
      "Large datasets",
      "Data archival",
      "Intermediate results",
      "Collaborative data sharing",
    ],
    key_features: [
      "Petabyte-scale capacity",
      "High-speed I/O",
      "Data management tools",
      "Backup and archival",
    ],
  },

  Cloud: {
    name: "Cloud Computing",
    description: "Flexible cloud-based computing resources",
    typical_use_cases: [
      "Web services",
      "Containers and microservices",
      "Science gateways",
      "Interactive computing",
      "Elastic workloads",
    ],
    key_features: ["On-demand resources", "Virtual machines", "Container support", "API access"],
  },
};

/**
 * Get field of science by name or partial match
 */
export function getFieldOfScience(fieldName: string): FieldOfScience | null {
  // Exact match
  if (FIELDS_OF_SCIENCE[fieldName]) {
    return FIELDS_OF_SCIENCE[fieldName];
  }

  // Case-insensitive partial match
  const lowerFieldName = fieldName.toLowerCase();
  for (const [key, value] of Object.entries(FIELDS_OF_SCIENCE)) {
    if (key.toLowerCase().includes(lowerFieldName) || lowerFieldName.includes(key.toLowerCase())) {
      return value;
    }
  }

  return null;
}

/**
 * Get all field names
 */
export function getFieldNames(): string[] {
  return Object.keys(FIELDS_OF_SCIENCE);
}

/**
 * Get allocation type by name
 */
export function getAllocationType(typeName: string): AllocationType | null {
  // Exact match
  if (ALLOCATION_TYPES[typeName]) {
    return ALLOCATION_TYPES[typeName];
  }

  // Case-insensitive partial match
  const lowerTypeName = typeName.toLowerCase();
  for (const [key, value] of Object.entries(ALLOCATION_TYPES)) {
    if (key.toLowerCase() === lowerTypeName) {
      return value;
    }
  }

  return null;
}

/**
 * ACCESS-CI Feature Codes
 * These numeric codes identify capabilities and characteristics of ACCESS resources
 * Derived from the ACCESS Operations API resource catalog
 */
export const ACCESS_FEATURE_CODES: Record<number, string> = {
  // Core resource capabilities
  100: "GPU Computing",
  101: "High Memory Computing",
  102: "High Performance Storage",
  103: "High Throughput Computing",
  104: "Large Scale Computing",

  // Access and interface types
  134: "Cloud Computing Platform",
  135: "Container Support",
  136: "Virtual Machine Support",
  137: "Science Gateway Resource", // Often excluded from general listings
  138: "Interactive Computing",
  139: "ACCESS Allocated Resource", // Requires ACCESS allocation

  // Specialized capabilities
  140: "Data Transfer Node",
  141: "Visualization Capabilities",
  142: "GPU Acceleration",
  143: "AI/ML Optimized",
  144: "Quantum Computing",

  // Network and I/O
  145: "High-Speed Networking",
  146: "Parallel I/O",
  147: "Data Staging",

  // Software and environment
  148: "Specialized Software Stack",
  149: "Custom Environments",
  150: "Jupyter Support",
  151: "RStudio Support",

  // Note: This is a partial mapping based on observed feature IDs
  // Complete documentation may be available from ACCESS Operations team
};

/**
 * Get feature name by code
 */
export function getFeatureName(featureCode: number): string {
  return ACCESS_FEATURE_CODES[featureCode] || `Unknown Feature (${featureCode})`;
}

/**
 * Get feature names for an array of codes
 */
export function getFeatureNames(featureCodes: number[]): string[] {
  return featureCodes.map((code) => getFeatureName(code));
}

/**
 * Major ACCESS-CI Systems Catalog
 * Based on https://ara.access-ci.org/ resource advisor
 */
export interface AccessSystem {
  name: string;
  organization: string;
  description: string;
  strengths: string[];
  gpu_types?: string[];
  max_memory_per_node?: string;
  storage_capacity?: string;
  user_interfaces: string[];
  ideal_for: string[];
  experience_level: string[];
}

export const ACCESS_SYSTEMS: Record<string, AccessSystem> = {
  Delta: {
    name: "Delta",
    organization: "NCSA (University of Illinois)",
    description: "GPU-focused system with NVIDIA A100 and A40 GPUs",
    strengths: ["AI/ML", "Deep Learning", "GPU Computing", "Large Models"],
    gpu_types: ["NVIDIA A100 (40GB/80GB)", "NVIDIA A40"],
    max_memory_per_node: "256 GB (CPU nodes), 2 TB (large memory)",
    storage_capacity: "Large parallel filesystem",
    user_interfaces: ["SSH", "Open OnDemand", "Jupyter"],
    ideal_for: [
      "Training large language models",
      "Deep learning research",
      "GPU-accelerated simulations",
      "Computer vision",
    ],
    experience_level: ["Intermediate", "Advanced"],
  },

  "Bridges-2": {
    name: "Bridges-2",
    organization: "PSC (Pittsburgh Supercomputing Center)",
    description: "Versatile system with CPU, GPU, and high-memory nodes",
    strengths: ["General Purpose", "High Memory", "GPU Computing", "Visualization"],
    gpu_types: ["NVIDIA V100", "NVIDIA A100", "NVIDIA A40"],
    max_memory_per_node: "4 TB Extreme Memory nodes",
    storage_capacity: "15 PB",
    user_interfaces: ["SSH", "Open OnDemand", "Jupyter", "RStudio", "VS Code"],
    ideal_for: [
      "Genome assembly",
      "Large-scale data analytics",
      "Mixed workloads (CPU+GPU)",
      "Memory-intensive applications",
    ],
    experience_level: ["Beginner", "Intermediate", "Advanced"],
  },

  Anvil: {
    name: "Anvil",
    organization: "Purdue University",
    description: "Composable subsystem architecture with flexible resource allocation",
    strengths: ["Composable Architecture", "Flexible Resources", "CPU Computing"],
    max_memory_per_node: "256 GB (standard), 1 TB (large memory)",
    storage_capacity: "Multi-PB",
    user_interfaces: ["SSH", "Open OnDemand", "Jupyter"],
    ideal_for: [
      "Parallel CPU applications",
      "Genomics workflows",
      "Data science",
      "Gateway hosting",
    ],
    experience_level: ["Beginner", "Intermediate", "Advanced"],
  },

  Expanse: {
    name: "Expanse",
    organization: "SDSC (San Diego Supercomputing Center)",
    description: "Balanced CPU and GPU computing with excellent storage",
    strengths: ["Data-Intensive Computing", "GPU Computing", "CPU Computing"],
    gpu_types: ["NVIDIA V100"],
    max_memory_per_node: "2 TB",
    storage_capacity: "7 PB parallel storage",
    user_interfaces: ["SSH", "Jupyter", "RStudio"],
    ideal_for: [
      "Data analytics at scale",
      "Bioinformatics",
      "Machine learning",
      "Simulation science",
    ],
    experience_level: ["Intermediate", "Advanced"],
  },

  Stampede3: {
    name: "Stampede3",
    organization: "TACC (Texas Advanced Computing Center)",
    description: "Leadership-class supercomputer with NVIDIA Grace-Hopper",
    strengths: ["Leadership Computing", "AI/ML", "Large-Scale Simulation"],
    gpu_types: ["NVIDIA Grace Hopper Superchip"],
    max_memory_per_node: "480 GB (Grace-Hopper)",
    user_interfaces: ["SSH", "TACC Portal"],
    ideal_for: [
      "Grand challenge problems",
      "Large-scale AI training",
      "Extreme-scale simulations",
      "Leadership-class workloads",
    ],
    experience_level: ["Advanced", "Expert"],
  },

  Jetstream2: {
    name: "Jetstream2",
    organization: "Indiana University",
    description: "Cloud computing platform for interactive science and gateways",
    strengths: ["Cloud Computing", "Interactive Computing", "Science Gateways", "Flexibility"],
    gpu_types: ["NVIDIA A100"],
    user_interfaces: ["Exosphere (web)", "OpenStack API", "Jupyter", "RStudio"],
    ideal_for: [
      "Science gateways",
      "Web services",
      "Interactive analysis",
      "Classroom use",
      "Container-based workflows",
    ],
    experience_level: ["Beginner", "Intermediate"],
  },

  "Open Science Grid": {
    name: "Open Science Grid",
    organization: "OSG Consortium",
    description: "High-throughput computing for distributed workflows",
    strengths: ["High-Throughput Computing", "Distributed Computing", "Workflows"],
    user_interfaces: ["HTCondor", "APIs"],
    ideal_for: [
      "High-throughput workflows",
      "Parameter sweeps",
      "Embarrassingly parallel tasks",
      "Large-scale ensembles",
    ],
    experience_level: ["Intermediate", "Advanced"],
  },
};

/**
 * Memory requirements guide
 */
export const MEMORY_REQUIREMENTS = {
  "< 64 GB": {
    description: "Standard memory for most applications",
    typical_uses: ["Serial applications", "Small datasets", "Code development"],
    recommended_systems: ["Anvil", "Bridges-2", "Expanse"],
  },
  "64-256 GB": {
    description: "Medium memory for moderate-scale applications",
    typical_uses: ["Parallel applications", "Medium datasets", "Ensemble runs"],
    recommended_systems: ["Delta", "Anvil", "Bridges-2", "Expanse"],
  },
  "256-512 GB": {
    description: "High memory for large-scale applications",
    typical_uses: ["Large genomic assemblies", "Big data analytics", "In-memory databases"],
    recommended_systems: ["Bridges-2", "Anvil"],
  },
  "> 512 GB": {
    description: "Extreme memory for the largest problems",
    typical_uses: ["Whole genome assembly", "Extreme-scale graph analytics", "Very large matrices"],
    recommended_systems: ["Bridges-2 (up to 4TB)"],
  },
};

/**
 * GPU selection guide based on use case
 */
export const GPU_SELECTION_GUIDE = {
  "Large Language Models": {
    recommended_gpu: "NVIDIA A100 80GB or Grace-Hopper",
    recommended_systems: ["Delta", "Stampede3"],
    min_memory: "80 GB per GPU",
    notes: "Multi-GPU required for models >10B parameters",
  },
  "Computer Vision": {
    recommended_gpu: "NVIDIA A100 40GB or V100",
    recommended_systems: ["Delta", "Bridges-2", "Expanse"],
    min_memory: "16-40 GB per GPU",
    notes: "A100 recommended for training, V100 sufficient for inference",
  },
  "Molecular Dynamics": {
    recommended_gpu: "NVIDIA A100 or V100",
    recommended_systems: ["Delta", "Bridges-2", "Expanse"],
    min_memory: "16-40 GB per GPU",
    notes: "Double-precision performance important",
  },
  "General AI/ML": {
    recommended_gpu: "NVIDIA V100 or A100",
    recommended_systems: ["Delta", "Bridges-2", "Expanse", "Jetstream2"],
    min_memory: "16-40 GB per GPU",
    notes: "V100 good for most workloads, A100 for larger models",
  },
};
