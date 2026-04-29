pipeline {
    agent { label 'nodejs-worker' } [cite: 1]

    environment {
        IMAGE_NAME = "node-shopping-app" [cite: 1]
        DYNAMIC_PORT = "${7000 + env.BUILD_ID.toInteger()}" [cite: 1]
        // Credentials stored in Jenkins Manage Credentials
        MONGO_CREDS = credentials('mongodb-atlas-creds') 
        MONGO_DB = "shop" [cite: 2]
    }

    stages {
        stage('Cleanup Environment') {
            steps {
                script {
                    // Clean up any previous container using the target port [cite: 3]
                    sh "docker ps -q --filter publish=${DYNAMIC_PORT} | xargs -r docker rm -f"
                    sh "docker rm -f container_${env.BUILD_NUMBER} || true" [cite: 3]
                }
            }
        }

        stage('Build & Tag') {
            steps {
                // Build the image using the Dockerfile in the root [cite: 4, 10]
                sh "docker build -t ${IMAGE_NAME}:v${env.BUILD_NUMBER} ." [cite: 4]
            }
        }

        stage('Deploy Dynamic Container') {
            steps {
                script {
                    echo "Deploying to Port: ${DYNAMIC_PORT}" [cite: 6]
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

        stage('Verify Deployment') {
            steps {
                // Wait for Node.js to initialize and connect to MongoDB
                sleep 10
                sh "curl -sI http://localhost:${DYNAMIC_PORT} | grep '200 OK'"
            }
        }
    }

    post {
        success {
            echo "SUCCESS! Build #${env.BUILD_NUMBER} is live at http://<SLAVE-IP>:${DYNAMIC_PORT}" [cite: 9]
        }
        failure {
            echo "Deployment failed. Check Docker logs for container_${env.BUILD_NUMBER}"
        }
    }
}