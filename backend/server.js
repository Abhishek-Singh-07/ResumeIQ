const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { PDFParse } = require("pdf-parse");

const app = express();


// File upload configuration
const upload = multer({
    storage: multer.memoryStorage()
});


// Middleware
app.use(cors());
app.use(express.json());


// Home route
app.get("/", (req, res) => {
    res.json({
        message: "ResumeIQ Backend is running"
    });
});


// Test API
app.get("/api/test", (req, res) => {
    res.json({
        message: "Frontend connected to ResumeIQ backend successfully"
    });
});


// Resume Analysis API
app.post("/api/analyze", upload.single("resume"), async (req, res) => {

    const { jobDescription } = req.body;


    // Check resume
    if (!req.file) {
        return res.status(400).json({
            message: "Resume PDF is required"
        });
    }


    // Check job description
    if (!jobDescription || !jobDescription.trim()) {
        return res.status(400).json({
            message: "Job description is required"
        });
    }


    try {

        // Create PDF parser
        const parser = new PDFParse({
            data: req.file.buffer
        });


        // Extract text from PDF
        const result = await parser.getText();


        // Release parser resources
        await parser.destroy();


        const resumeText = result.text;

        console.log("Resume text extracted successfully.");


        // Convert everything to lowercase
        const resume = resumeText.toLowerCase();
        const job = jobDescription.toLowerCase();


        // Skills supported by ResumeIQ
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
                patterns: ["react", "react.js"]
            },

            {
                name: "node.js",
                patterns: ["node", "node.js"]
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
                patterns: ["mongodb", "mongo db"]
            },

            {
                name: "git",
                patterns: ["git"]
            },

            {
                name: "spring boot",
                patterns: ["spring boot"]
            },

            {
                name: "express.js",
                patterns: ["express", "express.js"]
            },

            {
                name: "html",
                patterns: ["html", "html5"]
            },

            {
                name: "css",
                patterns: ["css", "css3"]
            },

            {
                name: "flask",
                patterns: ["flask"]
            },

            {
                name: "rest api",
                patterns: ["rest api", "restful api"]
            }

        ];


        // Arrays for matched and missing skills
        const matchedSkills = [];
        const missingSkills = [];


        // Check each skill
        skills.forEach((skill) => {

            // Check whether job description requires this skill
            const jobHasSkill = skill.patterns.some((pattern) => {

                const patternRegex = new RegExp(
                    `(^|[^a-z0-9])${pattern.replace(".", "\\.")}([^a-z0-9]|$)`,
                    "i"
                );

                return patternRegex.test(job);

            });


            // Only analyze skills required by the job
            if (jobHasSkill) {

                // Check whether resume contains this skill
                const resumeHasSkill = skill.patterns.some((pattern) => {

                    const patternRegex = new RegExp(
                        `(^|[^a-z0-9])${pattern.replace(".", "\\.")}([^a-z0-9]|$)`,
                        "i"
                    );

                    return patternRegex.test(resume);

                });


                if (resumeHasSkill) {

                    matchedSkills.push(skill.name);

                } else {

                    missingSkills.push(skill.name);

                }

            }

        });


        // Calculate ATS score
        const totalRequiredSkills =
            matchedSkills.length + missingSkills.length;


        let atsScore = 0;


        if (totalRequiredSkills > 0) {

            atsScore = Math.round(
                (matchedSkills.length / totalRequiredSkills) * 100
            );

        }


        // Generate suggestions
        const suggestions = [];


        // Missing skills suggestion
        if (missingSkills.length > 0) {

            suggestions.push(
                `Consider adding relevant skills mentioned in the job description: ${missingSkills.join(", ")}`
            );

        }


        // Score-based suggestion
        if (atsScore < 50) {

            suggestions.push(
                "Your resume has a low skill match with the job description. Consider adding more relevant technical keywords."
            );

        } else if (atsScore < 80) {

            suggestions.push(
                "Your resume has a moderate match. Review the missing skills and update your resume if you have relevant experience."
            );

        } else {

            suggestions.push(
                "Your resume has a strong technical skill match with this job description."
            );

        }


        // General suggestion
        suggestions.push(
            "Use clear and relevant technical keywords from the job description when they accurately describe your experience."
        );


        // Send result to frontend
        res.json({

            message: "Resume analyzed successfully",

            atsScore: atsScore,

            matchedSkills: matchedSkills,

            missingSkills: missingSkills,

            suggestions: suggestions

        });


    } catch (error) {

        console.error("PDF processing error:", error);

        res.status(500).json({
            message: "Unable to read the resume PDF"
        });

    }

});


// Start server
const PORT = 5000;

app.listen(PORT, () => {

    console.log(
        `Server running on http://localhost:${PORT}`
    );

});