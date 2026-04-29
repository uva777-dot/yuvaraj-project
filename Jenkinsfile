pipeline {
    // Force the build to run on the Slave node labeled 'nodejs-worker'
    agent { label 'nodejs-worker' } [cite: 1]

    environment {
        IMAGE_NAME = "node-shopping-app" [cite: 1]
        // Securely fetch credentials from Jenkins UI (Username with password type)
        MONGO_CREDS = credentials('mongodb-atlas-creds') 
        MONGO_DB   = "shop" [cite: 2]
        // Dynamic Port: Base 7000 + Build Number (e.g., Build #5 = 7005)
        DYNAMIC_PORT = "${7000 + env.BUILD_ID.toInteger()}" [cite: 1]
    }

    stages {
        stage('Cleanup Environment') {
            steps {
                script {
                    // Find and kill any container using our target port to avoid "port already allocated" [cite: 3]
                    sh "docker ps -q --filter publish=${DYNAMIC_PORT} | xargs -r docker rm -f" [cite: 3]
                    // Also remove by name to prevent naming conflicts [cite: 3]
                    sh "docker rm -f container_${env.BUILD_NUMBER} || true" [cite: 3]
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                // Build image with unique version tag based on build number [cite: 4]
                sh "docker build -t ${IMAGE_NAME}:v${env.BUILD_NUMBER} ." [cite: 4]
            }
        }

        stage('Run Dynamic Container') {
            steps {
                script {
                    echo "Deploying to Port: ${DYNAMIC_PORT}" [cite: 5]
                    // Injecting Jenkins Credentials (USR and PSW) into Docker Environment Variables [cite: 7]
                    sh """
                    docker run -d \
                      --name container_${env.BUILD_NUMBER} \
                      -p ${DYNAMIC_PORT}:7000 \
                      -e MONGO_USER=${MONGO_CREDS_USR} \
                      -e MONGO_PWD=${MONGO_CREDS_PSW} \
                      -e MONGO_DB=${MONGO_DB} \
                      -e PORT=7000 \
                      ${IMAGE_NAME}:v${env.BUILD_NUMBER}
                    """ [cite: 6, 7, 8]
                }
            }
        }
        
        stage('Health Check') {
            steps {
                // Wait for Node.js to initialize and connect to MongoDB
                sleep 5
                // Simple check to see if the port is responding
                sh "curl -f http://localhost:${DYNAMIC_PORT} || exit 1"
            }
        }
    }

    post {
        success {
            echo "SUCCESS! Build #${env.BUILD_NUMBER} is live." [cite: 9]
            echo "URL: http://<YOUR-SLAVE-IP>:${DYNAMIC_PORT}" [cite: 9]
        }
        always {
            // Optional: Clean up unused dangling images to save space on the slave
            sh "docker image prune -f"
        }
    }
}
