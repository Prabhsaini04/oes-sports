// ENG-SPT-017 — Jenkins + Docker CI/CD pipeline (ADR-SPT-001). This is a
// first-cut local pipeline definition: install -> lint -> typecheck ->
// build -> docker build -> docker compose up (local deploy). DevOps-led
// per ENG-SPT-002-implementation-plan.md §5 ("listed here for sequencing
// visibility only") — written here as a starting point, not a finished,
// reviewed CI/CD design (no staging/production deploy stage, no secret
// store wiring, no real Vercel/Firebase deploy credentials).
pipeline {
    agent any

    options {
        timestamps()
    }

    stages {
        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Lint') {
            steps {
                sh 'npm run lint'
            }
        }

        stage('Typecheck') {
            steps {
                sh 'npm run typecheck'
            }
        }

        stage('Build (Next.js)') {
            steps {
                sh '''
                  NEXT_PUBLIC_FIREBASE_API_KEY=demo-api-key \
                  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-oes-sports.firebaseapp.com \
                  NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-oes-sports \
                  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=demo-oes-sports.appspot.com \
                  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=000000000000 \
                  NEXT_PUBLIC_FIREBASE_APP_ID=1:000000000000:web:0000000000000000000000 \
                  NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true \
                  NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 \
                  NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST=localhost:8080 \
                  npm run build
                '''
            }
        }

        stage('Docker build') {
            steps {
                sh 'docker compose build'
            }
        }

        stage('Deploy locally') {
            steps {
                sh 'docker compose up -d'
                sh 'sleep 5 && curl -sf http://localhost:3000/ > /dev/null'
            }
        }
    }

    post {
        always {
            echo 'No automatic teardown — this is the "running condition" local deploy stage; stop with docker compose down when done.'
        }
    }
}
