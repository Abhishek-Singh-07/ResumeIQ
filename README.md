# ResumeIQ

### Resume Analyzer & ATS Optimization Platform

ResumeIQ is a full-stack web application that analyzes resumes against job descriptions and generates an ATS compatibility score.

It evaluates technical skills, job-description keywords, resume sections, and overall job-description matching using a rule-based analysis engine.

## Features

* Resume PDF upload and text extraction
* ATS compatibility score
* Technical skill matching
* Job-description keyword matching
* Required and preferred skill analysis
* Support for structured and unstructured job descriptions
* Skill synonym and variation matching
* Resume section detection
* Missing skills and keyword suggestions
* Analysis history
* Individual analysis viewing
* JWT-based authentication
* User-specific analysis history
* Password hashing using bcrypt
* MySQL database persistence
* PDF file-type validation
* 10 MB resume upload limit
* Input validation and error handling

## Tech Stack

### Frontend

* React.js
* Vite
* JavaScript
* HTML5
* CSS3

### Backend

* Node.js
* Express.js
* Multer
* PDF Parse
* JWT
* bcryptjs
* CORS

### Database

* MySQL

## How Resume Analysis Works

ResumeIQ follows a rule-based scoring process.

### 1. Resume Processing

The user uploads a PDF resume.

The backend extracts readable text from the PDF and normalizes it for analysis.

### 2. Technical Skill Analysis

ResumeIQ maintains a technical skill catalog covering areas such as:

* Programming languages
* Frontend technologies
* Backend technologies
* APIs
* Databases
* Cloud
* DevOps
* Testing
* Data analytics
* AI/ML
* Security

The system compares the skills identified in the job description with the skills found in the resume.

### 3. Keyword Analysis

ResumeIQ checks important ATS-related concepts such as:

* Developer roles
* Development
* APIs
* Databases
* Testing
* Debugging
* Version control
* Problem solving
* Communication
* Teamwork
* Agile
* Cloud
* Deployment
* Performance

Common variations are supported so that similar terms can be recognized.

### 4. Resume Section Analysis

The system checks for important resume sections:

* Education
* Skills
* Projects
* Experience
* Certifications

Common heading variations are also supported.

For example:

`Technical Skills` → Skills

`Academic Background` → Education

`Personal Projects` → Projects

`Professional Experience` → Experience

`Certifications & Courses` → Certifications

### 5. Job Description Match

ResumeIQ supports different job-description structures:

* Required Skills only
* Preferred Skills only
* Required + Preferred Skills
* Unstructured job descriptions

Required skills receive higher importance than preferred skills when both sections are available.

### 6. Final ATS Score

The final score is calculated using:

| Component             | Weight |
| --------------------- | -----: |
| Technical Skills      |    50% |
| Keywords              |    20% |
| Resume Sections       |    15% |
| Job Description Match |    15% |

## Authentication

ResumeIQ uses JWT-based authentication.

Authentication features include:

* User registration
* User login
* JWT token generation
* Protected API routes
* User-specific analysis history
* User-specific analysis access
* Logout handling

Passwords are stored using bcrypt hashing rather than plain text.

## Database Structure

The application uses MySQL with two main tables.

### users

Stores user account information:

* id
* name
* email
* password_hash
* created_at

### analysis_history

Stores resume analysis information:

* analysis id
* file name
* analysis timestamp
* ATS score
* matched skills
* missing skills
* matched keywords
* missing keywords
* resume sections
* score breakdown
* suggestions
* user id

Each analysis is linked to the user who created it.

## Project Structure

```text
ResumeIQ/
│
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── Auth.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
├── README.md
└── ...
```

> The `.env` file contains local configuration and should not be committed to GitHub.

## Running the Project Locally

### Prerequisites

Make sure the following are installed:

* Node.js
* npm
* MySQL

### Backend Setup

Open a terminal:

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend` folder:

```env
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=resumeiq
DB_PORT=3306
JWT_SECRET=your_jwt_secret
```

Start the backend:

```bash
node server.js
```

Backend:

```text
http://localhost:5000
```

### Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

## Security & Validation

ResumeIQ includes several validation and security measures:

* JWT authentication
* Protected analysis APIs
* User-specific history access
* bcrypt password hashing
* Parameterized MySQL queries
* Email validation
* Password length validation
* Duplicate email prevention
* PDF-only upload validation
* 10 MB file-size limit
* Invalid JWT handling
* Invalid analysis ID handling
* Frontend and backend error handling

## Testing

The project has been tested for:

* Required-only job descriptions
* Preferred-only job descriptions
* Required + preferred job descriptions
* Unstructured job descriptions
* Skill variations
* Case and punctuation variations
* Duplicate skills and keywords
* False-positive skill detection
* Resume section variations
* Missing input validation
* Invalid login
* Duplicate registration
* JWT protection
* User authorization
* User-specific history
* Invalid file types
* Corrupted PDF handling
* Large file handling
* SQL injection attempts
* XSS input handling
* Password hashing
* Analysis persistence
* History limits
* Production frontend build

## Current Limitations

ResumeIQ uses a rule-based analysis engine rather than a machine-learning or generative-AI model.

Therefore, analysis quality depends on the skill catalog and keyword rules maintained by the application.

More advanced semantic matching could be added in future versions.

## Future Improvements

* More advanced semantic resume-to-JD matching
* Resume formatting analysis
* Better section detection
* More industry-specific skill catalogs
* Resume improvement suggestions
* Exportable analysis reports
* Recruiter/company-specific ATS profiles
* Automated test coverage
* Production deployment

## Author

**Abhishek Singh**

B.Tech CSE & AI
Pranveer Singh Institute of Technology (PSIT)

GitHub: [Abhishek-Singh-07](https://github.com/Abhishek-Singh-07)
