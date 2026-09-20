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
    storage: multer.memoryStorage()
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
// JWT HELPER
// ==================================================

function createToken(user) {

    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured");
    }

    return jwt.sign(
        {
            userId: String(user.id),
            email: user.email
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

function authenticateToken(req, res, next) {

    const authHeader =
        req.headers.authorization;


    if (!authHeader) {

        return res.status(401).json({
            message:
                "Authentication token is required"
        });

    }


    if (!authHeader.startsWith("Bearer ")) {

        return res.status(401).json({
            message:
                "Invalid authentication format"
        });

    }


    const token =
        authHeader.split(" ")[1];


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


        req.user = decoded;

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

app.get("/", (req, res) => {

    res.json({
        message:
            "ResumeIQ Backend is running"
    });

});


// ==================================================
// TEST API
// ==================================================

app.get("/api/test", (req, res) => {

    res.json({
        message:
            "Frontend connected to ResumeIQ backend successfully"
    });

});


// ==================================================
// USER REGISTRATION API
// ==================================================

app.post("/api/register", async (req, res) => {

    try {

        const {
            name,
            email,
            password
        } = req.body;


        // Validation

        if (!name || !name.trim()) {

            return res.status(400).json({
                message:
                    "Name is required"
            });

        }


        if (!email || !email.trim()) {

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


        if (password.length < 6) {

            return res.status(400).json({
                message:
                    "Password must be at least 6 characters long"
            });

        }


        const cleanName =
            name.trim();


        const cleanEmail =
            email.trim().toLowerCase();


        // Email validation

        const emailRegex =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


        if (!emailRegex.test(cleanEmail)) {

            return res.status(400).json({
                message:
                    "Please enter a valid email address"
            });

        }


        // Check existing user

        const [existingUsers] =
            await pool.execute(
                `
                SELECT id
                FROM users
                WHERE email = ?
                LIMIT 1
                `,
                [cleanEmail]
            );


        if (existingUsers.length > 0) {

            return res.status(409).json({
                message:
                    "An account with this email already exists"
            });

        }


        // Hash password

        const passwordHash =
            await bcrypt.hash(
                password,
                10
            );


        // Create user

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


        // Create JWT

        const token =
            createToken({
                id: userId,
                email: cleanEmail
            });


        // Response

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

});


// ==================================================
// USER LOGIN API
// ==================================================

app.post("/api/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;


        // Validation

        if (!email || !email.trim()) {

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


        // Find user

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
                [cleanEmail]
            );


        if (users.length === 0) {

            return res.status(401).json({
                message:
                    "Invalid email or password"
            });

        }


        const user =
            users[0];


        // Compare password

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


        // Create JWT

        const token =
            createToken(user);


        // Response

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

});


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
                    [userId]
                );


            const history =
                rows.map((row) => ({

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

                }));


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


            if (rows.length === 0) {

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
                    data: req.file.buffer
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
            // 1. TECHNICAL SKILLS - 50%
            // ==================================================

            const skills = [

                {
                    name: "java",
                    patterns: ["java"]
                },

                {
                    name: "javascript",
                    patterns: ["javascript"]
                },

                {
                    name: "react",
                    patterns: [
                        "react",
                        "react.js"
                    ]
                },

                {
                    name: "node.js",
                    patterns: [
                        "node",
                        "node.js"
                    ]
                },

                {
                    name: "python",
                    patterns: ["python"]
                },

                {
                    name: "sql",
                    patterns: ["sql"]
                },

                {
                    name: "mysql",
                    patterns: ["mysql"]
                },

                {
                    name: "mongodb",
                    patterns: [
                        "mongodb",
                        "mongo db"
                    ]
                },

                {
                    name: "git",
                    patterns: ["git"]
                },

                {
                    name: "spring boot",
                    patterns: [
                        "spring boot"
                    ]
                },

                {
                    name: "express.js",
                    patterns: [
                        "express",
                        "express.js"
                    ]
                },

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
                    name: "flask",
                    patterns: ["flask"]
                },

                {
                    name: "rest api",
                    patterns: [
                        "rest api",
                        "restful api"
                    ]
                }

            ];


            const matchedSkills = [];

            const missingSkills = [];


            skills.forEach((skill) => {

                const jobHasSkill =
                    skill.patterns.some(
                        (pattern) => {

                            return containsPattern(
                                job,
                                pattern
                            );

                        }
                    );


                if (jobHasSkill) {

                    const resumeHasSkill =
                        skill.patterns.some(
                            (pattern) => {

                                return containsPattern(
                                    resume,
                                    pattern
                                );

                            }
                        );


                    if (resumeHasSkill) {

                        matchedSkills.push(
                            skill.name
                        );

                    } else {

                        missingSkills.push(
                            skill.name
                        );

                    }

                }

            });


            // ==================================================
            // TECHNICAL SKILL SCORE
            // ==================================================

            const totalRequiredSkills =
                matchedSkills.length +
                missingSkills.length;


            let skillScore = 0;


            if (totalRequiredSkills > 0) {

                skillScore =
                    (
                        matchedSkills.length /
                        totalRequiredSkills
                    ) * 100;

            }


            // ==================================================
            // 2. IMPORTANT KEYWORDS - 20%
            // ==================================================

            const importantKeywords = [

                "development",
                "developer",
                "software",
                "web",
                "application",
                "backend",
                "frontend",
                "database",
                "api",
                "testing",
                "debugging",
                "problem solving",
                "teamwork",
                "communication",
                "agile",
                "github",
                "deployment",
                "cloud"

            ];


            const matchedKeywords = [];

            const missingKeywords = [];


            importantKeywords.forEach(
                (keyword) => {

                    if (
                        containsPattern(
                            job,
                            keyword
                        )
                    ) {

                        if (
                            containsPattern(
                                resume,
                                keyword
                            )
                        ) {

                            matchedKeywords.push(
                                keyword
                            );

                        } else {

                            missingKeywords.push(
                                keyword
                            );

                        }

                    }

                }
            );


            // ==================================================
            // KEYWORD SCORE
            // ==================================================

            const totalKeywords =
                matchedKeywords.length +
                missingKeywords.length;


            let keywordScore = 0;


            if (totalKeywords > 0) {

                keywordScore =
                    (
                        matchedKeywords.length /
                        totalKeywords
                    ) * 100;

            }


            // ==================================================
            // 3. RESUME SECTIONS - 15%
            // ==================================================

            const sections = [

                {
                    name: "Education",

                    patterns: [
                        "education",
                        "b.tech",
                        "bachelor"
                    ]

                },

                {
                    name: "Skills",

                    patterns: [
                        "skills",
                        "technical skills"
                    ]

                },

                {
                    name: "Projects",

                    patterns: [
                        "projects",
                        "project"
                    ]

                },

                {
                    name: "Experience",

                    patterns: [
                        "experience",
                        "internship",
                        "intern"
                    ]

                },

                {
                    name: "Certifications",

                    patterns: [
                        "certification",
                        "certifications",
                        "certificate"
                    ]

                }

            ];


            const presentSections = [];

            const missingSections = [];


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


                    if (sectionFound) {

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

            const jobWords =
                job

                    .replace(
                        /[^a-z0-9\s]/g,
                        " "
                    )

                    .split(/\s+/)

                    .filter(
                        (word) =>
                            word.length >= 4
                    );


            const uniqueJobWords =
                [
                    ...new Set(jobWords)
                ];


            let matchedJobWords = 0;


            uniqueJobWords.forEach(
                (word) => {

                    if (
                        resume.includes(word)
                    ) {

                        matchedJobWords++;

                    }

                }
            );


            let jdMatchScore = 0;


            if (
                uniqueJobWords.length > 0
            ) {

                jdMatchScore =
                    (
                        matchedJobWords /
                        uniqueJobWords.length
                    ) * 100;

            }


            // ==================================================
            // FINAL WEIGHTED ATS SCORE
            // ==================================================

            const finalScore =

                (skillScore * 0.50) +

                (keywordScore * 0.20) +

                (sectionScore * 0.15) +

                (jdMatchScore * 0.15);


            const atsScore =
                Math.round(finalScore);


            // ==================================================
            // SUGGESTIONS
            // ==================================================

            const suggestions = [];


            if (
                missingSkills.length > 0
            ) {

                suggestions.push(

                    `Consider adding relevant skills mentioned in the job description: ${missingSkills.join(", ")}`

                );

            }


            if (
                missingKeywords.length > 0
            ) {

                suggestions.push(

                    `Consider reviewing these important keywords: ${missingKeywords.join(", ")}`

                );

            }


            if (
                missingSections.length > 0
            ) {

                suggestions.push(

                    `Your resume may benefit from these sections: ${missingSections.join(", ")}`

                );

            }


            if (atsScore < 50) {

                suggestions.push(

                    "Your resume has a low overall match with the job description. Consider improving relevant skills and keywords."

                );

            } else if (atsScore < 80) {

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
                Math.round(skillScore);


            const finalKeywordScore =
                Math.round(keywordScore);


            const resumeSectionsScore =
                Math.round(sectionScore);


            const jobDescriptionMatchScore =
                Math.round(jdMatchScore);


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
                        matchedKeywords
                    ),

                    JSON.stringify(
                        missingKeywords
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
                    matchedKeywords,

                missingKeywords:
                    missingKeywords,

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
// START SERVER
// ==================================================

const PORT = 5000;


async function startServer() {

    await testDatabaseConnection();


    app.listen(
        PORT,
        () => {

            console.log(
                `Server running on http://localhost:${PORT}`
            );

        }
    );

}


startServer();