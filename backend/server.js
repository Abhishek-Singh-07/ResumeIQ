require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PDFParse } = require("pdf-parse");
const { pool, testDatabaseConnection } = require("./db");

const app = express();


// ==================================================
// FILE UPLOAD CONFIGURATION
// ==================================================

const upload = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: 10 * 1024 * 1024
    },

    fileFilter: (req, file, cb) => {

        if (file.mimetype !== "application/pdf") {
            return cb(
                new Error("Only PDF resumes are supported.")
            );
        }

        cb(null, true);
    }
});


// ==================================================
// MIDDLEWARE
// ==================================================

app.use(cors());
app.use(express.json());


// ==================================================
// HELPER FUNCTIONS
// ==================================================

function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


function containsPattern(text, pattern) {
    const escapedPattern = escapeRegex(pattern);

    const patternRegex = new RegExp(
        `(^|[^a-z0-9])${escapedPattern}([^a-z0-9]|$)`,
        "i"
    );

    return patternRegex.test(text);
}


function parseJsonColumn(value) {
    if (value === null || value === undefined) {
        return [];
    }

    if (typeof value === "object") {
        return value;
    }

    try {
        return JSON.parse(value);
    } catch (error) {
        return [];
    }
}


// ==================================================
// WORD NORMALIZATION
// ==================================================

const stopWords = new Set([
    "this",
    "that",
    "with",
    "from",
    "have",
    "will",
    "your",
    "their",
    "about",
    "into",
    "using",
    "work",
    "working",
    "worked",
    "team",
    "teams",
    "join",
    "looking",
    "motivated",
    "responsibility",
    "responsibilities",
    "required",
    "preferred",
    "skills",
    "skill",
    "role",
    "roles",
    "good",
    "strong",
    "knowledge",
    "experience",
    "ability",
    "degree",
    "related",
    "field",
    "such",
    "more",
    "than",
    "other",
    "also",
    "only",
    "should",
    "these",
    "those",
    "where",
    "which",
    "while",
    "candidate",
    "candidates",
    "position",
    "opportunity",
    "seeking",
    "company",
    "organization",
    "organisation",
    "develop",
    "developing",
    "development",
    "maintain",
    "maintaining",
    "build",
    "building",
    "create",
    "creating",
    "provide",
    "providing",
    "ensure",
    "ensuring",
    "support",
    "supporting",
    "including",
    "bachelor",
    "bachelors",
    "computer",
    "science",
    "information",
    "technology",
    "years",
    "year",
    "must",
    "need",
    "needs",
    "first",
    "second",
    "third",
    "and",
    "the",
    "for",
    "are",
    "you",
    "our",
    "they",
    "we"
]);


function normalizeWord(word) {
    let normalized = word.toLowerCase().trim();

    if (
        normalized.endsWith("ies") &&
        normalized.length > 5
    ) {
        normalized =
            normalized.slice(0, -3) + "y";

    } else if (
        normalized.endsWith("ing") &&
        normalized.length > 6
    ) {
        normalized =
            normalized.slice(0, -3);

    } else if (
        normalized.endsWith("ed") &&
        normalized.length > 5
    ) {
        normalized =
            normalized.slice(0, -2);

    } else if (
        normalized.endsWith("s") &&
        normalized.length > 4
    ) {
        normalized =
            normalized.slice(0, -1);
    }

    return normalized;
}


function getMeaningfulWords(text) {
    return text
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .map(normalizeWord)
        .filter(
            (word) =>
                word.length >= 4 &&
                !stopWords.has(word)
        );
}


// ==================================================
// UNIVERSAL TECHNICAL + DOMAIN SKILL CATALOG
// ==================================================

const SKILL_CATALOG = [

    // ----------------------------------------------
    // Programming Languages
    // ----------------------------------------------

    {
        name: "java",
        patterns: [
            "java"
        ]
    },

    {
        name: "python",
        patterns: [
            "python"
        ]
    },

    {
        name: "javascript",
        patterns: [
            "javascript"
        ]
    },

    {
        name: "typescript",
        patterns: [
            "typescript"
        ]
    },

    {
        name: "c++",
        patterns: [
            "c++"
        ]
    },

    {
        name: "c#",
        patterns: [
            "c#"
        ]
    },

    {
        name: "php",
        patterns: [
            "php"
        ]
    },

    {
        name: "kotlin",
        patterns: [
            "kotlin"
        ]
    },

    {
        name: "swift",
        patterns: [
            "swift"
        ]
    },

    {
        name: "golang",
        patterns: [
            "golang",
            "go language"
        ]
    },


    // ----------------------------------------------
    // Frontend
    // ----------------------------------------------

    {
        name: "html",
        patterns: [
            "html",
            "html5"
        ]
    },

    {
        name: "css",
        patterns: [
            "css",
            "css3"
        ]
    },

    {
        name: "react",
        patterns: [
            "react",
            "react.js",
            "reactjs"
        ]
    },

    {
        name: "angular",
        patterns: [
            "angular"
        ]
    },

    {
        name: "vue.js",
        patterns: [
            "vue",
            "vue.js",
            "vuejs"
        ]
    },

    {
        name: "next.js",
        patterns: [
            "next.js",
            "nextjs"
        ]
    },

    {
        name: "bootstrap",
        patterns: [
            "bootstrap"
        ]
    },

    {
        name: "tailwind css",
        patterns: [
            "tailwind",
            "tailwind css"
        ]
    },

    {
        name: "jquery",
        patterns: [
            "jquery"
        ]
    },

    {
        name: "figma",
        patterns: [
            "figma"
        ]
    },


    // ----------------------------------------------
    // Backend
    // ----------------------------------------------

    {
        name: "node.js",
        patterns: [
            "node",
            "node.js",
            "nodejs"
        ]
    },

    {
        name: "express.js",
        patterns: [
            "express",
            "express.js",
            "expressjs"
        ]
    },

    {
        name: "spring boot",
        patterns: [
            "spring boot"
        ]
    },

    {
        name: "spring",
        patterns: [
            "spring framework"
        ]
    },

    {
        name: "django",
        patterns: [
            "django"
        ]
    },

    {
        name: "flask",
        patterns: [
            "flask"
        ]
    },

    {
        name: "fastapi",
        patterns: [
            "fastapi",
            "fast api"
        ]
    },

    {
        name: ".net",
        patterns: [
            ".net",
            "dotnet"
        ]
    },

    {
        name: "asp.net",
        patterns: [
            "asp.net",
            "asp net"
        ]
    },

    {
        name: "laravel",
        patterns: [
            "laravel"
        ]
    },


    // ----------------------------------------------
    // APIs / Architecture
    // ----------------------------------------------

    {
        name: "rest api",
        patterns: [
            "rest api",
            "restful api",
            "rest apis"
        ]
    },

    {
        name: "graphql",
        patterns: [
            "graphql"
        ]
    },

    {
        name: "microservices",
        patterns: [
            "microservices",
            "microservice"
        ]
    },

    {
        name: "web services",
        patterns: [
            "web services",
            "web service"
        ]
    },

    {
        name: "api integration",
        patterns: [
            "api integration",
            "integrating apis",
            "integrate apis"
        ]
    },


    // ----------------------------------------------
    // Databases
    // ----------------------------------------------

    {
        name: "sql",
        patterns: [
            "sql"
        ]
    },

    {
        name: "mysql",
        patterns: [
            "mysql"
        ]
    },

    {
        name: "postgresql",
        patterns: [
            "postgresql",
            "postgres"
        ]
    },

    {
        name: "mongodb",
        patterns: [
            "mongodb",
            "mongo db"
        ]
    },

    {
        name: "oracle",
        patterns: [
            "oracle database",
            "oracle sql"
        ]
    },

    {
        name: "sqlite",
        patterns: [
            "sqlite"
        ]
    },

    {
        name: "redis",
        patterns: [
            "redis"
        ]
    },

    {
        name: "cassandra",
        patterns: [
            "cassandra"
        ]
    },

    {
        name: "snowflake",
        patterns: [
            "snowflake"
        ]
    },


    // ----------------------------------------------
    // Cloud
    // ----------------------------------------------

    {
        name: "aws",
        patterns: [
            "aws",
            "amazon web services"
        ]
    },

    {
        name: "azure",
        patterns: [
            "azure",
            "microsoft azure"
        ]
    },

    {
        name: "gcp",
        patterns: [
            "gcp",
            "google cloud",
            "google cloud platform"
        ]
    },

    {
        name: "cloud computing",
        patterns: [
            "cloud computing"
        ]
    },

    {
        name: "firebase",
        patterns: [
            "firebase"
        ]
    },


    // ----------------------------------------------
    // DevOps
    // ----------------------------------------------

    {
        name: "docker",
        patterns: [
            "docker"
        ]
    },

    {
        name: "kubernetes",
        patterns: [
            "kubernetes",
            "k8s"
        ]
    },

    {
        name: "jenkins",
        patterns: [
            "jenkins"
        ]
    },

    {
        name: "github",
        patterns: [
            "github"
        ]
    },

    {
        name: "gitlab",
        patterns: [
            "gitlab"
        ]
    },

    {
        name: "git",
        patterns: [
            "git"
        ]
    },

    {
        name: "linux",
        patterns: [
            "linux"
        ]
    },

    {
        name: "terraform",
        patterns: [
            "terraform"
        ]
    },

    {
        name: "ci/cd",
        patterns: [
            "ci/cd",
            "cicd",
            "continuous integration",
            "continuous delivery",
            "continuous deployment"
        ]
    },

    {
        name: "deployment",
        patterns: [
            "deployment",
            "deploying",
            "deployed"
        ]
    },


    // ----------------------------------------------
    // Testing / QA
    // ----------------------------------------------

    {
        name: "selenium",
        patterns: [
            "selenium"
        ]
    },

    {
        name: "playwright",
        patterns: [
            "playwright"
        ]
    },

    {
        name: "cypress",
        patterns: [
            "cypress"
        ]
    },

    {
        name: "junit",
        patterns: [
            "junit"
        ]
    },

    {
        name: "testng",
        patterns: [
            "testng"
        ]
    },

    {
        name: "pytest",
        patterns: [
            "pytest"
        ]
    },

    {
        name: "postman",
        patterns: [
            "postman"
        ]
    },

    {
        name: "api testing",
        patterns: [
            "api testing"
        ]
    },

    {
        name: "manual testing",
        patterns: [
            "manual testing"
        ]
    },

    {
        name: "functional testing",
        patterns: [
            "functional testing"
        ]
    },

    {
        name: "regression testing",
        patterns: [
            "regression testing"
        ]
    },

    {
        name: "integration testing",
        patterns: [
            "integration testing"
        ]
    },

    {
        name: "test automation",
        patterns: [
            "test automation",
            "automation testing",
            "automated testing"
        ]
    },

    {
        name: "test case design",
        patterns: [
            "test case design",
            "test case development",
            "test cases"
        ]
    },

    {
        name: "quality assurance",
        patterns: [
            "quality assurance",
            "quality assurance testing"
        ]
    },

    {
        name: "defect tracking",
        patterns: [
            "defect tracking",
            "bug tracking",
            "defect management"
        ]
    },


    // ----------------------------------------------
    // Data / Analytics
    // ----------------------------------------------

    {
        name: "data analysis",
        patterns: [
            "data analysis",
            "data analytics"
        ]
    },

    {
        name: "data visualization",
        patterns: [
            "data visualization",
            "data visualisation",
            "data visualizations"
        ]
    },

    {
        name: "statistics",
        patterns: [
            "statistics",
            "statistical analysis",
            "statistical modeling",
            "statistical modelling"
        ]
    },

    {
        name: "data cleaning",
        patterns: [
            "data cleaning",
            "data cleansing"
        ]
    },

    {
        name: "data preprocessing",
        patterns: [
            "data preprocessing",
            "data pre-processing",
            "data preparation"
        ]
    },

    {
        name: "data modeling",
        patterns: [
            "data modeling",
            "data modelling"
        ]
    },

    {
        name: "business intelligence",
        patterns: [
            "business intelligence",
            "business analytics"
        ]
    },

    {
        name: "reporting",
        patterns: [
            "reporting",
            "report generation"
        ]
    },

    {
        name: "data quality",
        patterns: [
            "data quality",
            "data validation",
            "data accuracy"
        ]
    },

    {
        name: "power bi",
        patterns: [
            "power bi"
        ]
    },

    {
        name: "tableau",
        patterns: [
            "tableau"
        ]
    },

    {
        name: "excel",
        patterns: [
            "excel",
            "microsoft excel"
        ]
    },

    {
        name: "spark",
        patterns: [
            "apache spark",
            "spark"
        ]
    },

    {
        name: "hadoop",
        patterns: [
            "hadoop"
        ]
    },

    {
        name: "kafka",
        patterns: [
            "kafka"
        ]
    },

    {
        name: "airflow",
        patterns: [
            "airflow",
            "apache airflow"
        ]
    },

    {
        name: "databricks",
        patterns: [
            "databricks"
        ]
    },

    {
        name: "dbt",
        patterns: [
            "dbt"
        ]
    },

    {
        name: "looker",
        patterns: [
            "looker"
        ]
    },


    // ----------------------------------------------
    // AI / Machine Learning
    // ----------------------------------------------

    {
        name: "machine learning",
        patterns: [
            "machine learning",
            "machine-learning"
        ]
    },

    {
        name: "deep learning",
        patterns: [
            "deep learning",
            "deep-learning"
        ]
    },

    {
        name: "natural language processing",
        patterns: [
            "natural language processing",
            "nlp"
        ]
    },

    {
        name: "generative ai",
        patterns: [
            "generative ai",
            "genai"
        ]
    },

    {
        name: "tensorflow",
        patterns: [
            "tensorflow"
        ]
    },

    {
        name: "pytorch",
        patterns: [
            "pytorch"
        ]
    },

    {
        name: "pandas",
        patterns: [
            "pandas"
        ]
    },

    {
        name: "numpy",
        patterns: [
            "numpy"
        ]
    },

    {
        name: "scikit-learn",
        patterns: [
            "scikit-learn",
            "sklearn"
        ]
    },

    {
        name: "model evaluation",
        patterns: [
            "model evaluation",
            "model validation",
            "model assessment"
        ]
    },

    {
        name: "feature engineering",
        patterns: [
            "feature engineering",
            "feature selection"
        ]
    },

    {
        name: "model deployment",
        patterns: [
            "model deployment",
            "deploy machine learning models",
            "deploy ml models"
        ]
    },

    {
        name: "predictive modeling",
        patterns: [
            "predictive modeling",
            "predictive modelling"
        ]
    },

    {
        name: "regression modeling",
        patterns: [
            "regression modeling",
            "regression modelling",
            "regression algorithm",
            "regression algorithms"
        ]
    },

    {
        name: "classification",
        patterns: [
            "classification",
            "classification algorithms"
        ]
    },

    {
        name: "computer vision",
        patterns: [
            "computer vision"
        ]
    },


    // ----------------------------------------------
    // Security
    // ----------------------------------------------

    {
        name: "cybersecurity",
        patterns: [
            "cybersecurity",
            "cyber security"
        ]
    },

    {
        name: "information security",
        patterns: [
            "information security"
        ]
    },

    {
        name: "application security",
        patterns: [
            "application security"
        ]
    },

    {
        name: "oauth",
        patterns: [
            "oauth",
            "oauth2"
        ]
    },

    {
        name: "jwt",
        patterns: [
            "jwt",
            "json web token"
        ]
    },


    // ----------------------------------------------
    // Business / Tools
    // ----------------------------------------------

    {
        name: "jira",
        patterns: [
            "jira"
        ]
    },

    {
        name: "salesforce",
        patterns: [
            "salesforce"
        ]
    },

    {
        name: "servicenow",
        patterns: [
            "servicenow",
            "service now"
        ]
    },


    // ----------------------------------------------
    // Methodology
    // ----------------------------------------------

    {
        name: "agile",
        patterns: [
            "agile"
        ]
    },

    {
        name: "scrum",
        patterns: [
            "scrum"
        ]
    }

];


// ==================================================
// ATS KEYWORD RULES
// ==================================================

const KEYWORD_RULES = [

    // ----------------------------------------------
    // Job Roles
    // ----------------------------------------------

    {
        name: "developer",
        patterns: [
            "developer",
            "developers",
            "software developer",
            "software developers",
            "software engineer",
            "software engineers",
            "software development engineer",
            "application developer",
            "application developers",
            "full stack developer",
            "full-stack developer",
            "full stack development",
            "full-stack development",
            "frontend developer",
            "front end developer",
            "front-end developer",
            "backend developer",
            "back end developer",
            "back-end developer",
            "programmer",
            "programmers",
            "sde"
        ]
    },

    {
        name: "full stack",
        patterns: [
            "full stack",
            "full-stack"
        ]
    },

    {
        name: "frontend",
        patterns: [
            "frontend",
            "front end",
            "front-end",
            "frontend development",
            "front-end development"
        ]
    },

    {
        name: "backend",
        patterns: [
            "backend",
            "back end",
            "back-end",
            "backend development",
            "back-end development"
        ]
    },

    {
        name: "data analyst",
        patterns: [
            "data analyst",
            "data analysts"
        ]
    },

    {
        name: "business analyst",
        patterns: [
            "business analyst",
            "business analysts"
        ]
    },

    {
        name: "analyst",
        patterns: [
            "analyst",
            "analysts"
        ]
    },

    {
        name: "qa",
        patterns: [
            "qa engineer",
            "qa tester",
            "quality assurance",
            "quality analyst"
        ]
    },


    // ----------------------------------------------
    // Development
    // ----------------------------------------------

    {
        name: "development",
        patterns: [
            "development",
            "develop",
            "developed",
            "developing",
            "software development",
            "application development",
            "web development",
            "build",
            "built",
            "building",
            "create",
            "created",
            "creating"
        ]
    },

    {
        name: "software",
        patterns: [
            "software",
            "software system",
            "software systems"
        ]
    },

    {
        name: "web",
        patterns: [
            "web application",
            "web applications",
            "web development",
            "web technologies",
            "web application development"
        ]
    },

    {
        name: "application",
        patterns: [
            "application",
            "applications",
            "software application",
            "software applications"
        ]
    },


    // ----------------------------------------------
    // API / Database
    // ----------------------------------------------

    {
        name: "api",
        patterns: [
            "api",
            "apis",
            "rest api",
            "restful api",
            "rest apis",
            "web api",
            "web apis",
            "api integration",
            "api development"
        ]
    },

{
    name: "database",
    patterns: [
        "database",
        "databases",
        "database management",
        "database systems",
        "sql database",
        "sql databases",
        "mysql",
        "mysql database",
        "postgresql",
        "postgres",
        "postgresql database",
        "mongodb",
        "mongo db",
        "mongodb database"
    ]
},

    {
        name: "sql",
        patterns: [
            "sql",
            "sql queries",
            "sql query"
        ]
    },


    // ----------------------------------------------
    // Testing
    // ----------------------------------------------

    {
        name: "testing",
        patterns: [
            "testing",
            "software testing",
            "test cases",
            "quality testing",
            "testing process",
            "testing practices"
        ]
    },

    {
        name: "debugging",
        patterns: [
            "debugging",
            "debug",
            "bug fixing",
            "bug fixes",
            "bugs",
            "troubleshooting",
            "troubleshoot",
            "troubleshooted",
            "issue resolution",
            "resolve issues",
            "resolving issues",
            "application issues",
            "fix issues",
            "fixing issues"
        ]
    },

    {
        name: "test automation",
        patterns: [
            "test automation",
            "automation testing",
            "automated testing"
        ]
    },

    {
        name: "automation",
        patterns: [
            "automation",
            "automate",
            "automating",
            "automated"
        ]
    },

    {
        name: "code review",
        patterns: [
            "code review",
            "code reviews",
            "review code",
            "reviewing code"
        ]
    },


    // ----------------------------------------------
    // Soft Skills
    // ----------------------------------------------

    {
        name: "problem solving",
        patterns: [
            "problem solving",
            "problem-solving",
            "problem solver",
            "problem solving skills",
            "problem-solving skills"
        ]
    },

    {
        name: "communication",
        patterns: [
            "communication",
            "communication skills",
            "communicate",
            "communicating",
            "verbal communication",
            "written communication",
            "professional communication",
            "communication abilities"
        ]
    },

    {
        name: "teamwork",
        patterns: [
            "teamwork",
            "team work",
            "collaboration",
            "collaborative",
            "collaborate",
            "collaborating",
            "team collaboration",
            "working with the team",
            "work with the team",
            "working in a team",
            "work in a team",
            "team member",
            "team members"
        ]
    },

    {
        name: "leadership",
        patterns: [
            "leadership",
            "leadership skills",
            "lead teams",
            "team leadership"
        ]
    },

    {
        name: "stakeholder management",
        patterns: [
            "stakeholder management",
            "stakeholders",
            "stakeholder communication"
        ]
    },

    {
        name: "analytical skills",
        patterns: [
            "analytical skills",
            "analytical ability",
            "analytical thinking"
        ]
    },


    // ----------------------------------------------
    // Development Practices
    // ----------------------------------------------

    {
        name: "version control",
        patterns: [
            "version control",
            "source control",
            "source code management",
            "git",
            "github",
            "gitlab"
        ]
    },

    {
        name: "documentation",
        patterns: [
            "documentation",
            "technical documentation",
            "document application",
            "document applications",
            "documenting"
        ]
    },

    {
        name: "requirements analysis",
        patterns: [
            "requirements analysis",
            "requirement analysis",
            "requirement gathering",
            "requirements gathering"
        ]
    },

    {
        name: "agile",
        patterns: [
            "agile",
            "agile methodology",
            "agile development",
            "agile practices"
        ]
    },

    {
        name: "scrum",
        patterns: [
            "scrum"
        ]
    },

    {
        name: "deployment",
        patterns: [
            "deployment",
            "deploy",
            "deploying",
            "deployed"
        ]
    },


    // ----------------------------------------------
    // Performance / Architecture
    // ----------------------------------------------

    {
        name: "performance",
        patterns: [
            "performance",
            "performance optimization",
            "application performance",
            "system performance"
        ]
    },

    {
        name: "optimization",
        patterns: [
            "optimization",
            "optimize",
            "optimized",
            "optimizing"
        ]
    },

    {
        name: "scalability",
        patterns: [
            "scalability",
            "scalable",
            "scaling"
        ]
    },

    {
        name: "microservices",
        patterns: [
            "microservices",
            "microservice",
            "microservice architecture"
        ]
    },


    // ----------------------------------------------
    // Cloud / DevOps
    // ----------------------------------------------

    {
        name: "cloud",
        patterns: [
            "cloud",
            "cloud computing",
            "cloud services",
            "cloud platform",
            "cloud platforms"
        ]
    },

    {
        name: "ci/cd",
        patterns: [
            "ci/cd",
            "cicd",
            "continuous integration",
            "continuous delivery",
            "continuous deployment"
        ]
    },


    // ----------------------------------------------
    // Data / Analytics
    // ----------------------------------------------

    {
        name: "data analysis",
        patterns: [
            "data analysis",
            "data analytics",
            "analyze data",
            "analyse data",
            "data analyst"
        ]
    },

    {
        name: "data visualization",
        patterns: [
            "data visualization",
            "data visualisation",
            "data visualizations",
            "data charts",
            "data dashboards"
        ]
    },

    {
        name: "statistical analysis",
        patterns: [
            "statistical analysis",
            "statistical modeling",
            "statistical modelling",
            "statistics"
        ]
    },

    {
        name: "reporting",
        patterns: [
            "reporting",
            "reports",
            "report generation",
            "generate reports",
            "reporting skills"
        ]
    },

    {
        name: "business intelligence",
        patterns: [
            "business intelligence",
            "business analytics"
        ]
    },

    {
        name: "data quality",
        patterns: [
            "data quality",
            "data accuracy",
            "data validation"
        ]
    },


    // ----------------------------------------------
    // AI / ML
    // ----------------------------------------------

    {
        name: "machine learning",
        patterns: [
            "machine learning",
            "machine-learning"
        ]
    },

    {
        name: "deep learning",
        patterns: [
            "deep learning",
            "deep-learning"
        ]
    },

    {
        name: "natural language processing",
        patterns: [
            "natural language processing",
            "nlp"
        ]
    },

    {
        name: "generative ai",
        patterns: [
            "generative ai",
            "genai"
        ]
    },

    {
        name: "model evaluation",
        patterns: [
            "model evaluation",
            "model validation",
            "model assessment"
        ]
    },

    {
        name: "feature engineering",
        patterns: [
            "feature engineering",
            "feature selection"
        ]
    },

    {
        name: "model deployment",
        patterns: [
            "model deployment",
            "deploy machine learning models",
            "deploy ml models"
        ]
    },

    {
        name: "predictive modeling",
        patterns: [
            "predictive modeling",
            "predictive modelling"
        ]
    },


    // ----------------------------------------------
    // Security
    // ----------------------------------------------

    {
        name: "security",
        patterns: [
            "security",
            "application security",
            "information security"
        ]
    },

    {
        name: "cybersecurity",
        patterns: [
            "cybersecurity",
            "cyber security"
        ]
    },


    // ----------------------------------------------
    // Business
    // ----------------------------------------------

    {
        name: "customer service",
        patterns: [
            "customer service",
            "customer support"
        ]
    },

    {
        name: "project management",
        patterns: [
            "project management",
            "project manager"
        ]
    },

    {
        name: "presentation",
        patterns: [
            "presentation",
            "presentations"
        ]
    }

];


// ==================================================
// ATS KEYWORD WEIGHTS
// ==================================================

const KEYWORD_WEIGHTS = {

    // High-value role-specific keywords
    developer: 3,
    "full stack": 3,
    frontend: 3,
    backend: 3,
    "data analyst": 3,
    "business analyst": 3,
    analyst: 2,
    qa: 3,

    // General development terms
    development: 1,
    software: 1,
    web: 1,
    application: 1,

    // API / Database
    api: 1,
    database: 1,
    sql: 1,

    // Testing
    testing: 2,
    debugging: 2,
    "test automation": 3,
    automation: 2,
    "code review": 2,

    // Soft / professional skills
    "problem solving": 2,
    communication: 2,
    teamwork: 2,
    leadership: 2,
    "stakeholder management": 2,
    "analytical skills": 2,

    // Development practices
    "version control": 2,
    documentation: 2,
    "requirements analysis": 2,
    agile: 2,
    scrum: 2,
    deployment: 2,

    // Performance / architecture
    performance: 2,
    optimization: 2,
    scalability: 2,
    microservices: 2,

    // Cloud / DevOps
    cloud: 1,
    "ci/cd": 2,

    // Data / Analytics
    "data analysis": 3,
    "data visualization": 3,
    "statistical analysis": 3,
    reporting: 2,
    "business intelligence": 3,
    "data quality": 2,

    // AI / ML
    "machine learning": 3,
    "deep learning": 3,
    "natural language processing": 3,
    "generative ai": 3,
    "model evaluation": 3,
    "feature engineering": 3,
    "model deployment": 3,
    "predictive modeling": 3,

    // Security
    security: 2,
    cybersecurity: 3,

    // Business
    "customer service": 2,
    "project management": 2,
    presentation: 1
};


// ==================================================
// EXTRACT JD SECTION
// ==================================================

function extractSection(
    text,
    startRegexes,
    endRegexes
) {

    let startMatch = null;

    for (const regex of startRegexes) {

        const match = text.match(regex);

        if (
            match &&
            (
                !startMatch ||
                match.index < startMatch.index
            )
        ) {
            startMatch = match;
        }
    }

    if (!startMatch) {
        return "";
    }

    const startIndex =
        startMatch.index +
        startMatch[0].length;

    const remainingText =
        text.slice(startIndex);

    let endIndex =
        remainingText.length;

    for (const regex of endRegexes) {

        const match =
            remainingText.match(regex);

        if (
            match &&
            match.index < endIndex
        ) {

            endIndex =
                match.index;

        }
    }

    return remainingText.slice(
        0,
        endIndex
    );
}


// ==================================================
// CALCULATE SKILL MATCH
// ==================================================

function calculateSkillMatch(
    jdSkills,
    resumeText
) {

    if (jdSkills.length === 0) {
        return 0;
    }

    let matched = 0;

    jdSkills.forEach(
        (skill) => {

            const resumeHasSkill =
                skill.patterns.some(
                    (pattern) => {

                        return containsPattern(
                            resumeText,
                            pattern
                        );

                    }
                );

            if (resumeHasSkill) {
                matched++;
            }

        }
    );

    return (
        matched /
        jdSkills.length
    ) * 100;
}


// ==================================================
// FIND SKILLS PRESENT IN TEXT
// ==================================================

function getSkillsFromText(
    skills,
    text
) {

    return skills.filter(
        (skill) => {

            return skill.patterns.some(
                (pattern) => {

                    return containsPattern(
                        text,
                        pattern
                    );

                }
            );

        }
    );

}


// ==================================================
// JWT HELPER
// ==================================================

function createToken(user) {

    if (!process.env.JWT_SECRET) {

        throw new Error(
            "JWT_SECRET is not configured"
        );

    }

    return jwt.sign(
        {
            userId:
                String(user.id),

            email:
                user.email
        },

        process.env.JWT_SECRET,

        {
            expiresIn: "7d"
        }
    );
}


// ==================================================
// AUTHENTICATION MIDDLEWARE
// ==================================================

function authenticateToken(
    req,
    res,
    next
) {

    const authHeader =
        req.headers.authorization;

    // No Authorization header
    if (!authHeader) {

        return res.status(401).json({
            message:
                "Authentication token is required"
        });

    }

    // Must start with Bearer
    if (
        !authHeader
            .toLowerCase()
            .startsWith("bearer")
    ) {

        return res.status(401).json({
            message:
                "Invalid authentication format"
        });

    }

    // Extract everything after "Bearer"
    const token =
        authHeader
            .slice(6)
            .trim();

    // Bearer was provided, but no token exists
    if (!token) {

        return res.status(401).json({
            message:
                "Authentication token is missing"
        });

    }

    if (!process.env.JWT_SECRET) {

        console.error(
            "JWT_SECRET is not configured"
        );

        return res.status(500).json({
            message:
                "Server authentication configuration error"
        });

    }

    try {

        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );

        req.user =
            decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            message:
                "Invalid or expired authentication token"
        });

    }
}

// ==================================================
// HOME ROUTE
// ==================================================

app.get(
    "/",
    (req, res) => {

        res.json({
            message:
                "ResumeIQ Backend is running"
        });

    }
);


// ==================================================
// TEST API
// ==================================================

app.get(
    "/api/test",
    (req, res) => {

        res.json({
            message:
                "Frontend connected to ResumeIQ backend successfully"
        });

    }
);


// ==================================================
// USER REGISTRATION API
// ==================================================

app.post(
    "/api/register",
    async (req, res) => {

        try {

            const {
                name,
                email,
                password
            } = req.body;


            if (
                !name ||
                !name.trim()
            ) {

                return res.status(400).json({
                    message:
                        "Name is required"
                });

            }


            if (
                !email ||
                !email.trim()
            ) {

                return res.status(400).json({
                    message:
                        "Email is required"
                });

            }


            if (!password) {

                return res.status(400).json({
                    message:
                        "Password is required"
                });

            }


            if (
                password.length < 6
            ) {

                return res.status(400).json({
                    message:
                        "Password must be at least 6 characters long"
                });

            }


            const cleanName =
                name.trim();

            const cleanEmail =
                email.trim().toLowerCase();


            const emailRegex =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


            if (
                !emailRegex.test(
                    cleanEmail
                )
            ) {

                return res.status(400).json({
                    message:
                        "Please enter a valid email address"
                });

            }


            const [existingUsers] =
                await pool.execute(
                    `
                    SELECT id
                    FROM users
                    WHERE email = ?
                    LIMIT 1
                    `,
                    [
                        cleanEmail
                    ]
                );


            if (
                existingUsers.length > 0
            ) {

                return res.status(409).json({
                    message:
                        "An account with this email already exists"
                });

            }


            const passwordHash =
                await bcrypt.hash(
                    password,
                    10
                );


            const [insertResult] =
                await pool.execute(
                    `
                    INSERT INTO users (
                        name,
                        email,
                        password_hash
                    )
                    VALUES (?, ?, ?)
                    `,
                    [
                        cleanName,
                        cleanEmail,
                        passwordHash
                    ]
                );


            const userId =
                insertResult.insertId;


            const token =
                createToken({
                    id:
                        userId,

                    email:
                        cleanEmail
                });


            res.status(201).json({

                message:
                    "Registration successful",

                user: {

                    id:
                        String(userId),

                    name:
                        cleanName,

                    email:
                        cleanEmail

                },

                token:
                    token

            });


        } catch (error) {

            console.error(
                "Registration error:",
                error
            );


            if (
                error.code ===
                "ER_DUP_ENTRY"
            ) {

                return res.status(409).json({
                    message:
                        "An account with this email already exists"
                });

            }


            res.status(500).json({
                message:
                    "Unable to register user"
            });

        }

    }
);


// ==================================================
// USER LOGIN API
// ==================================================

app.post(
    "/api/login",
    async (req, res) => {

        try {

            const {
                email,
                password
            } = req.body;


            if (
                !email ||
                !email.trim()
            ) {

                return res.status(400).json({
                    message:
                        "Email is required"
                });

            }


            if (!password) {

                return res.status(400).json({
                    message:
                        "Password is required"
                });

            }


            const cleanEmail =
                email.trim().toLowerCase();


            const [users] =
                await pool.execute(
                    `
                    SELECT
                        id,
                        name,
                        email,
                        password_hash
                    FROM users
                    WHERE email = ?
                    LIMIT 1
                    `,
                    [
                        cleanEmail
                    ]
                );


            if (
                users.length === 0
            ) {

                return res.status(401).json({
                    message:
                        "Invalid email or password"
                });

            }


            const user =
                users[0];


            const passwordMatch =
                await bcrypt.compare(
                    password,
                    user.password_hash
                );


            if (!passwordMatch) {

                return res.status(401).json({
                    message:
                        "Invalid email or password"
                });

            }


            const token =
                createToken(user);


            res.json({

                message:
                    "Login successful",

                user: {

                    id:
                        String(user.id),

                    name:
                        user.name,

                    email:
                        user.email

                },

                token:
                    token

            });


        } catch (error) {

            console.error(
                "Login error:",
                error
            );


            res.status(500).json({
                message:
                    "Unable to login"
            });

        }

    }
);


// ==================================================
// ANALYSIS HISTORY API
// ==================================================

app.get(
    "/api/history",
    authenticateToken,
    async (req, res) => {

        try {

            const userId =
                req.user.userId;


            const [rows] =
                await pool.query(
                    `
                    SELECT
                        id,
                        file_name AS fileName,
                        created_at AS createdAt,
                        ats_score AS atsScore,

                        matched_skills AS matchedSkills,
                        missing_skills AS missingSkills,

                        matched_keywords AS matchedKeywords,
                        missing_keywords AS missingKeywords,

                        present_sections AS presentSections,
                        missing_sections AS missingSections,

                        technical_skills_score AS technicalSkills,
                        keyword_score AS keywords,
                        resume_sections_score AS resumeSections,
                        job_description_match_score AS jobDescriptionMatch,

                        suggestions

                    FROM analysis_history

                    WHERE user_id = ?

                    ORDER BY created_at DESC

                    LIMIT 10
                    `,
                    [
                        userId
                    ]
                );


            const history =
                rows.map(
                    (row) => ({

                        id:
                            row.id,

                        fileName:
                            row.fileName,

                        createdAt:
                            row.createdAt,

                        atsScore:
                            row.atsScore,

                        matchedSkills:
                            parseJsonColumn(
                                row.matchedSkills
                            ),

                        missingSkills:
                            parseJsonColumn(
                                row.missingSkills
                            ),

                        matchedKeywords:
                            parseJsonColumn(
                                row.matchedKeywords
                            ),

                        missingKeywords:
                            parseJsonColumn(
                                row.missingKeywords
                            ),

                        presentSections:
                            parseJsonColumn(
                                row.presentSections
                            ),

                        missingSections:
                            parseJsonColumn(
                                row.missingSections
                            ),

                        scoreBreakdown: {

                            technicalSkills:
                                row.technicalSkills,

                            keywords:
                                row.keywords,

                            resumeSections:
                                row.resumeSections,

                            jobDescriptionMatch:
                                row.jobDescriptionMatch

                        },

                        suggestions:
                            parseJsonColumn(
                                row.suggestions
                            )

                    })
                );


            res.json({

                message:
                    "Analysis history fetched successfully",

                history:
                    history

            });


        } catch (error) {

            console.error(
                "History fetch error:",
                error.message
            );


            res.status(500).json({

                message:
                    "Unable to fetch analysis history"

            });

        }

    }
);


// ==================================================
// SINGLE ANALYSIS HISTORY API
// ==================================================

app.get(
    "/api/history/:id",
    authenticateToken,
    async (req, res) => {

        try {

            const analysisId =
                req.params.id;

            const userId =
                req.user.userId;


            const [rows] =
                await pool.query(
                    `
                    SELECT
                        id,
                        file_name AS fileName,
                        created_at AS createdAt,
                        ats_score AS atsScore,

                        matched_skills AS matchedSkills,
                        missing_skills AS missingSkills,

                        matched_keywords AS matchedKeywords,
                        missing_keywords AS missingKeywords,

                        present_sections AS presentSections,
                        missing_sections AS missingSections,

                        technical_skills_score AS technicalSkills,
                        keyword_score AS keywords,
                        resume_sections_score AS resumeSections,
                        job_description_match_score AS jobDescriptionMatch,

                        suggestions

                    FROM analysis_history

                    WHERE id = ?
                    AND user_id = ?

                    LIMIT 1
                    `,
                    [
                        analysisId,
                        userId
                    ]
                );


            if (
                rows.length === 0
            ) {

                return res.status(404).json({
                    message:
                        "Analysis not found"
                });

            }


            const row =
                rows[0];


            const analysis = {

                id:
                    row.id,

                fileName:
                    row.fileName,

                createdAt:
                    row.createdAt,

                atsScore:
                    row.atsScore,

                matchedSkills:
                    parseJsonColumn(
                        row.matchedSkills
                    ),

                missingSkills:
                    parseJsonColumn(
                        row.missingSkills
                    ),

                matchedKeywords:
                    parseJsonColumn(
                        row.matchedKeywords
                    ),

                missingKeywords:
                    parseJsonColumn(
                        row.missingKeywords
                    ),

                presentSections:
                    parseJsonColumn(
                        row.presentSections
                    ),

                missingSections:
                    parseJsonColumn(
                        row.missingSections
                    ),

                scoreBreakdown: {

                    technicalSkills:
                        row.technicalSkills,

                    keywords:
                        row.keywords,

                    resumeSections:
                        row.resumeSections,

                    jobDescriptionMatch:
                        row.jobDescriptionMatch

                },

                suggestions:
                    parseJsonColumn(
                        row.suggestions
                    )

            };


            res.json({

                message:
                    "Analysis fetched successfully",

                analysis:
                    analysis

            });


        } catch (error) {

            console.error(
                "Single analysis fetch error:",
                error.message
            );


            res.status(500).json({

                message:
                    "Unable to fetch analysis"

            });

        }

    }
);


// ==================================================
// RESUME ANALYSIS API
// ==================================================

app.post(
    "/api/analyze",
    authenticateToken,
    upload.single("resume"),
    async (req, res) => {

        const {
            jobDescription
        } = req.body;


        // ==================================================
        // VALIDATION
        // ==================================================

        if (!req.file) {

            return res.status(400).json({

                message:
                    "Resume PDF is required"

            });

        }


        if (
            !jobDescription ||
            !jobDescription.trim()
        ) {

            return res.status(400).json({

                message:
                    "Job description is required"

            });

        }


        try {

            // ==================================================
            // EXTRACT TEXT FROM PDF
            // ==================================================

            const parser =
                new PDFParse({

                    data:
                        req.file.buffer

                });


            const result =
                await parser.getText();


            await parser.destroy();


            const resumeText =
                result.text || "";


            console.log(
                "Resume text extracted successfully."
            );


            // ==================================================
            // NORMALIZE TEXT
            // ==================================================

            const resume =
                resumeText.toLowerCase();


            const job =
                jobDescription.toLowerCase();


            // ==================================================
            // JD REQUIRED / PREFERRED SECTIONS
            // ==================================================

            const requiredSection =
                extractSection(

                    job,

                    [
                        /required\s+skills?\s*:/i,
                        /required\s+qualifications?\s*:/i,
                        /requirements?\s*:/i,
                        /must[-\s]?have\s*:?\s*/i
                    ],

                    [
                        /preferred\s+skills?\s*:/i,
                        /preferred\s+qualifications?\s*:/i,
                        /nice[-\s]+to[-\s]+have\s*:/i,
                        /responsibilities\s*:/i,
                        /education\s*:/i,
                        /benefits\s*:/i
                    ]

                );


            const preferredSection =
                extractSection(

                    job,

                    [
                        /preferred\s+skills?\s*:/i,
                        /preferred\s+qualifications?\s*:/i,
                        /nice[-\s]+to[-\s]+have\s*:/i
                    ],

                    [
                        /education\s*:/i,
                        /benefits\s*:/i,
                        /responsibilities\s*:/i
                    ]

                );


            // ==================================================
            // 1. TECHNICAL SKILLS - 50%
            // ==================================================

            const skills =
                SKILL_CATALOG;


            // --------------------------------------------------
            // Detect all technical/domain skills mentioned in JD
            // --------------------------------------------------

            const allJdSkills =
                getSkillsFromText(
                    skills,
                    job
                );


            const matchedSkills =
                [];

            const missingSkills =
                [];


            allJdSkills.forEach(
                (skill) => {

                    const resumeHasSkill =
                        skill.patterns.some(
                            (pattern) => {

                                return containsPattern(
                                    resume,
                                    pattern
                                );

                            }
                        );


                    if (
                        resumeHasSkill
                    ) {

                        matchedSkills.push(
                            skill.name
                        );

                    } else {

                        missingSkills.push(
                            skill.name
                        );

                    }

                }
            );


            // ==================================================
            // REQUIRED / PREFERRED TECHNICAL SKILLS
            // ==================================================

            const requiredJdSkills =
                getSkillsFromText(
                    skills,
                    requiredSection
                );


            const preferredJdSkills =
                getSkillsFromText(
                    skills,
                    preferredSection
                );


            // --------------------------------------------------
            // Prevent a skill from being counted as Preferred
            // when the same skill is explicitly Required.
            // --------------------------------------------------

            const requiredSkillNames =
                new Set(
                    requiredJdSkills.map(
                        (skill) =>
                            skill.name
                    )
                );


            const filteredPreferredJdSkills =
                preferredJdSkills.filter(
                    (skill) =>
                        !requiredSkillNames.has(
                            skill.name
                        )
                );


            // ==================================================
            // TECHNICAL SKILL SCORE
            // ==================================================

            let skillScore =
                0;


            // --------------------------------------------------
            // Required + Preferred
            // Required = 70%
            // Preferred = 30%
            // --------------------------------------------------

            if (
                requiredJdSkills.length > 0 &&
                filteredPreferredJdSkills.length > 0
            ) {

                const requiredScore =
                    calculateSkillMatch(
                        requiredJdSkills,
                        resume
                    );


                const preferredScore =
                    calculateSkillMatch(
                        filteredPreferredJdSkills,
                        resume
                    );


                skillScore =
                    (
                        requiredScore * 0.70
                    ) +
                    (
                        preferredScore * 0.30
                    );

            }


            // --------------------------------------------------
            // Only Required
            // --------------------------------------------------

            else if (
                requiredJdSkills.length > 0
            ) {

                skillScore =
                    calculateSkillMatch(
                        requiredJdSkills,
                        resume
                    );

            }


            // --------------------------------------------------
            // Only Preferred
            // Core JD Skills = 70%
            // Preferred Skills = 30%
            // --------------------------------------------------

            else if (
                filteredPreferredJdSkills.length > 0
            ) {

                const preferredSkillNames =
                    new Set(
                        filteredPreferredJdSkills.map(
                            (skill) =>
                                skill.name
                        )
                    );


                const coreJdSkills =
                    allJdSkills.filter(
                        (skill) =>
                            !preferredSkillNames.has(
                                skill.name
                            )
                    );


                if (
                    coreJdSkills.length > 0
                ) {

                    const coreScore =
                        calculateSkillMatch(
                            coreJdSkills,
                            resume
                        );


                    const preferredScore =
                        calculateSkillMatch(
                            filteredPreferredJdSkills,
                            resume
                        );


                    skillScore =
                        (
                            coreScore * 0.70
                        ) +
                        (
                            preferredScore * 0.30
                        );

                } else {

                    skillScore =
                        calculateSkillMatch(
                            filteredPreferredJdSkills,
                            resume
                        );

                }

            }


            // --------------------------------------------------
            // No explicit sections
            // Use all technical/domain skills equally
            // --------------------------------------------------

            else if (
                allJdSkills.length > 0
            ) {

                skillScore =
                    calculateSkillMatch(
                        allJdSkills,
                        resume
                    );

            }


            // --------------------------------------------------
            // Keep skill score between 0 and 100
            // --------------------------------------------------

            skillScore =
                Math.max(
                    0,
                    Math.min(
                        100,
                        Math.round(
                            skillScore
                        )
                    )
                );


            // ==================================================
            // 2. DYNAMIC ATS KEYWORDS - 20%
            // ==================================================

            const matchedKeywords =
                [];

            const missingKeywords =
                [];


            // --------------------------------------------------
            // Detect only meaningful ATS concepts from the JD
            // --------------------------------------------------

            const detectedKeywordRules =
                KEYWORD_RULES.filter(
                    (keywordRule) => {

                        return keywordRule.patterns.some(
                            (pattern) => {

                                return containsPattern(
                                    job,
                                    pattern
                                );

                            }
                        );

                    }
                );


            // --------------------------------------------------
            // Compare keywords with resume
            // --------------------------------------------------

            detectedKeywordRules.forEach(
                (keywordRule) => {

                    const resumeHasKeyword =
                        keywordRule.patterns.some(
                            (pattern) => {

                                return containsPattern(
                                    resume,
                                    pattern
                                );

                            }
                        );


                    if (
                        resumeHasKeyword
                    ) {

                        matchedKeywords.push(
                            keywordRule.name
                        );

                    } else {

                        missingKeywords.push(
                            keywordRule.name
                        );

                    }

                }
            );


            // --------------------------------------------------
            // Remove duplicates
            // --------------------------------------------------

            const uniqueMatchedKeywords =
                [
                    ...new Set(
                        matchedKeywords
                    )
                ];


            const uniqueMissingKeywords =
                [
                    ...new Set(
                        missingKeywords
                    )
                ];


            // ==================================================
            // WEIGHTED KEYWORD SCORE
            // ==================================================

            let matchedKeywordWeight =
                0;


            let totalKeywordWeight =
                0;


            // --------------------------------------------------
            // Calculate total weight of all detected keywords
            // --------------------------------------------------

            detectedKeywordRules.forEach(
                (keywordRule) => {

                    const weight =
                        KEYWORD_WEIGHTS[
                            keywordRule.name
                        ] || 1;


                    totalKeywordWeight +=
                        weight;

                }
            );


            // --------------------------------------------------
            // Calculate weight of matched keywords
            // --------------------------------------------------

            uniqueMatchedKeywords.forEach(
                (keywordName) => {

                    const weight =
                        KEYWORD_WEIGHTS[
                            keywordName
                        ] || 1;


                    matchedKeywordWeight +=
                        weight;

                }
            );


            let keywordScore =
                0;


            if (
                totalKeywordWeight > 0
            ) {

                keywordScore =
                    (
                        matchedKeywordWeight /
                        totalKeywordWeight
                    ) * 100;

            }


            // --------------------------------------------------
            // Keep keyword score between 0 and 100
            // --------------------------------------------------

            keywordScore =
                Math.max(
                    0,
                    Math.min(
                        100,
                        Math.round(
                            keywordScore
                        )
                    )
                );


            // ==================================================
            // 3. RESUME SECTIONS - 15%
            // ==================================================

            const sections = [

                {
                    name:
                        "Education",

                    patterns: [
                        "education",
                        "b.tech",
                        "bachelor"
                    ]

                },

                {
                    name:
                        "Skills",

                    patterns: [
                        "skills",
                        "technical skills"
                    ]

                },

                {
                    name:
                        "Projects",

                    patterns: [
                        "projects",
                        "project"
                    ]

                },

                {
                    name:
                        "Experience",

                    patterns: [
                        "experience",
                        "internship",
                        "intern",
                        "work experience"
                    ]

                },

                {
                    name:
                        "Certifications",

                    patterns: [
                        "certification",
                        "certifications",
                        "certificate"
                    ]

                }

            ];


            const presentSections =
                [];

            const missingSections =
                [];


            sections.forEach(
                (section) => {

                    const sectionFound =
                        section.patterns.some(
                            (pattern) => {

                                return containsPattern(
                                    resume,
                                    pattern
                                );

                            }
                        );


                    if (
                        sectionFound
                    ) {

                        presentSections.push(
                            section.name
                        );

                    } else {

                        missingSections.push(
                            section.name
                        );

                    }

                }
            );


            // ==================================================
            // RESUME SECTION SCORE
            // ==================================================

            const sectionScore =
                (
                    presentSections.length /
                    sections.length
                ) * 100;


            // ==================================================
            // 4. JOB DESCRIPTION MATCH - 15%
            // ==================================================

            /*
             * Required Skills -> 70%
             * Preferred Skills -> 30%
             *
             * If explicit sections are unavailable,
             * all technical/domain skills found in the JD
             * are used as fallback.
             */


            let jdMatchScore =
                0;


            // ==================================================
            // REQUIRED + PREFERRED
            // ==================================================

            if (
                requiredJdSkills.length > 0 &&
                filteredPreferredJdSkills.length > 0
            ) {

                const requiredScore =
                    calculateSkillMatch(
                        requiredJdSkills,
                        resume
                    );


                const preferredScore =
                    calculateSkillMatch(
                        filteredPreferredJdSkills,
                        resume
                    );


                jdMatchScore =
                    (
                        requiredScore * 0.70
                    ) +
                    (
                        preferredScore * 0.30
                    );

            }


            // ==================================================
            // ONLY REQUIRED
            // ==================================================

            else if (
                requiredJdSkills.length > 0
            ) {

                jdMatchScore =
                    calculateSkillMatch(
                        requiredJdSkills,
                        resume
                    );

            }


            // ==================================================
            // ONLY PREFERRED
            // Core JD Skills = 70%
            // Preferred Skills = 30%
            // ==================================================

            else if (
                filteredPreferredJdSkills.length > 0
            ) {

                const preferredSkillNames =
                    new Set(
                        filteredPreferredJdSkills.map(
                            (skill) =>
                                skill.name
                        )
                    );


                const coreJdSkills =
                    allJdSkills.filter(
                        (skill) =>
                            !preferredSkillNames.has(
                                skill.name
                            )
                    );


                if (
                    coreJdSkills.length > 0
                ) {

                    const coreScore =
                        calculateSkillMatch(
                            coreJdSkills,
                            resume
                        );


                    const preferredScore =
                        calculateSkillMatch(
                            filteredPreferredJdSkills,
                            resume
                        );


                    jdMatchScore =
                        (
                            coreScore * 0.70
                        ) +
                        (
                            preferredScore * 0.30
                        );

                } else {

                    jdMatchScore =
                        calculateSkillMatch(
                            filteredPreferredJdSkills,
                            resume
                        );

                }

            }


            // ==================================================
            // FALLBACK
            // ==================================================

            else if (
                allJdSkills.length > 0
            ) {

                jdMatchScore =
                    calculateSkillMatch(
                        allJdSkills,
                        resume
                    );

            }


            // ==================================================
            // KEEP JD SCORE BETWEEN 0 AND 100
            // ==================================================

            jdMatchScore =
                Math.max(
                    0,
                    Math.min(
                        100,
                        Math.round(
                            jdMatchScore
                        )
                    )
                );


            // ==================================================
            // FINAL WEIGHTED ATS SCORE
            // ==================================================

            const finalScore =
                (skillScore * 0.50) +
                (keywordScore * 0.20) +
                (sectionScore * 0.15) +
                (jdMatchScore * 0.15);


            const atsScore =
                Math.round(
                    finalScore
                );


            // ==================================================
            // SUGGESTIONS
            // ==================================================

            const suggestions =
                [];


            if (
                missingSkills.length > 0
            ) {

                suggestions.push(

                    `Consider adding relevant skills mentioned in the job description: ${missingSkills.join(", ")}`

                );

            }


            if (
                uniqueMissingKeywords.length > 0
            ) {

                suggestions.push(

                    `Consider reviewing these important keywords: ${uniqueMissingKeywords.join(", ")}`

                );

            }


            if (
                missingSections.length > 0
            ) {

                suggestions.push(

                    `Your resume may benefit from these sections: ${missingSections.join(", ")}`

                );

            }


            if (
                atsScore < 50
            ) {

                suggestions.push(

                    "Your resume has a low overall match with the job description. Consider improving relevant skills and keywords."

                );

            } else if (
                atsScore < 80
            ) {

                suggestions.push(

                    "Your resume has a moderate match. Review the missing skills, keywords, and sections."

                );

            } else {

                suggestions.push(

                    "Your resume has a strong overall match with this job description."

                );

            }


            suggestions.push(

                "Use job-description keywords only when they accurately describe your skills or experience."

            );


            // ==================================================
            // SCORE VALUES
            // ==================================================

            const technicalSkillsScore =
                Math.round(
                    skillScore
                );


            const finalKeywordScore =
                Math.round(
                    keywordScore
                );


            const resumeSectionsScore =
                Math.round(
                    sectionScore
                );


            const jobDescriptionMatchScore =
                Math.round(
                    jdMatchScore
                );


            // ==================================================
            // SAVE ANALYSIS TO MYSQL
            // ==================================================

            const analysisId =
                Date.now();


            const userId =
                req.user.userId;


            await pool.execute(

                `
                INSERT INTO analysis_history (

                    id,
                    file_name,
                    created_at,
                    ats_score,

                    matched_skills,
                    missing_skills,

                    matched_keywords,
                    missing_keywords,

                    present_sections,
                    missing_sections,

                    technical_skills_score,
                    keyword_score,
                    resume_sections_score,
                    job_description_match_score,

                    suggestions,

                    user_id

                )

                VALUES (
                    ?,
                    ?,
                    NOW(),
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?
                )
                `,

                [

                    analysisId,

                    req.file.originalname,

                    atsScore,

                    JSON.stringify(
                        matchedSkills
                    ),

                    JSON.stringify(
                        missingSkills
                    ),

                    JSON.stringify(
                        uniqueMatchedKeywords
                    ),

                    JSON.stringify(
                        uniqueMissingKeywords
                    ),

                    JSON.stringify(
                        presentSections
                    ),

                    JSON.stringify(
                        missingSections
                    ),

                    technicalSkillsScore,

                    finalKeywordScore,

                    resumeSectionsScore,

                    jobDescriptionMatchScore,

                    JSON.stringify(
                        suggestions
                    ),

                    userId

                ]

            );


            // ==================================================
            // SEND RESULT TO FRONTEND
            // ==================================================

            res.json({

                message:
                    "Resume analyzed successfully",

                id:
                    analysisId,

                fileName:
                    req.file.originalname,

                createdAt:
                    new Date().toISOString(),

                atsScore:
                    atsScore,

                matchedSkills:
                    matchedSkills,

                missingSkills:
                    missingSkills,

                matchedKeywords:
                    uniqueMatchedKeywords,

                missingKeywords:
                    uniqueMissingKeywords,

                presentSections:
                    presentSections,

                missingSections:
                    missingSections,

                scoreBreakdown: {

                    technicalSkills:
                        technicalSkillsScore,

                    keywords:
                        finalKeywordScore,

                    resumeSections:
                        resumeSectionsScore,

                    jobDescriptionMatch:
                        jobDescriptionMatchScore

                },

                suggestions:
                    suggestions

            });


        } catch (error) {

            console.error(
                "Resume analysis error:",
                error
            );


            res.status(500).json({

                message:
                    "Unable to analyze the resume",

                error:
                    error.message

            });

        }

    }
);
// ==================================================
// GLOBAL ERROR HANDLER
// ==================================================

app.use((error, req, res, next) => {

    // File is larger than the configured limit
    if (
        error instanceof multer.MulterError &&
        error.code === "LIMIT_FILE_SIZE"
    ) {

        return res.status(400).json({
            message:
                "Resume file is too large. Maximum allowed size is 10 MB."
        });

    }

    // Invalid file type from multer fileFilter
    if (
        error &&
        error.message ===
            "Only PDF resumes are supported."
    ) {

        return res.status(400).json({
            message:
                "Only PDF resumes are supported."
        });

    }

    // Other unexpected errors
    console.error(
        "Unhandled server error:",
        error
    );

    return res.status(500).json({
        message:
            "Something went wrong on the server."
    });

});


// ==================================================
// START SERVER
// ==================================================

const PORT =
    process.env.PORT || 5000;


async function startServer() {

    await testDatabaseConnection();


    app.listen(
    PORT,
    "0.0.0.0",
    () => {

            console.log(
                `Server running on port ${PORT}`
            );

        }
    );

}


startServer();