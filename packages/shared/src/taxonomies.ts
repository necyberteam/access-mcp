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
  },
};

/**
 * ACCESS Allocation Types with definitions and typical use cases
 *
 * NOTE: These are ACCESS policy values. No API exists to source them dynamically.
 * Review periodically against https://allocations.access-ci.org/ for accuracy.
 * Last verified: 2026-04-01
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
