pipeline {
    // This tells Jenkins to run the work on your Amazon Linux slave
    agent { 
        label 'nodejs-worker' 
    }

    environment {
        IMAGE_NAME = "node-shopping-app"
        // Credentials stored in Jenkins under ID 'mongodb-atlas-creds'
        MONGO_CREDS = credentials('mongodb-atlas-creds')
        MONGO_DB   = "shop"
        // Calculate the host port based on the build number
        DYNAMIC_PORT = "${7000 + env.BUILD_ID.toInteger()}"
    }

    stages {
        stage('Cleanup Environment') {
            steps {
                script {
                    // Remove existing containers on the dynamic port or with the same name to avoid conflicts
                    sh "docker ps -q --filter publish=${DYNAMIC_PORT} | xargs -r docker rm -f"
                    sh "docker rm -f container_${env.BUILD_NUMBER} || true"
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                // Build the image using the build number as a tag
                sh "docker build -t ${IMAGE_NAME}:v${env.BUILD_NUMBER} ."
            }
        }

        stage('Run Dynamic Container') {
            steps {
                script {
                    echo "Deploying to Port: ${DYNAMIC_PORT}"
                    // FIXED: Escaped the credentials variables with backslashes (\)
                    sh """
                    docker run -d \
                      --name container_${env.BUILD_NUMBER} \
                      -p ${DYNAMIC_PORT}:7000 \
                      -e MONGO_USER=\${MONGO_CREDS_USR} \
                      -e MONGO_PWD=\\${MONGO_CREDS_PSW} \
                      -e MONGO_DB=${MONGO_DB} \
                      -e PORT=7000 \
                      ${IMAGE_NAME}:v${env.BUILD_NUMBER}
                    """
                }
            }
        }

        stage('Health Check') {
            steps {
                script {
                    echo "Waiting 20 seconds for application to initialize and connect to MongoDB..."
                    sleep 20 
                    
                    // Attempt to curl the app. returnStatus: true prevents the build from crashing immediately
                    def status = sh(script: "curl -f http://localhost:${DYNAMIC_PORT}", returnStatus: true)
                    
                    if (status != 0) {
                        echo "--- ERROR DETECTED: PRINTING APPLICATION LOGS ---"
                        sh "docker logs container_${env.BUILD_NUMBER}"
                        echo "--- END OF LOGS ---"
                        error "Health check failed. The web server on port ${DYNAMIC_PORT} did not respond."
                    } else {
                        echo "Health check passed! Application is responding."
                    }
                }
            }
        }
    }

    post {
        success {
            echo "Build #${env.BUILD_NUMBER} is live at port ${DYNAMIC_PORT}"
            echo "Access URL: http://<YOUR-SLAVE-IP>:${DYNAMIC_PORT}"
            
            // Integrated success email alert
            emailext (
                subject: "SUCCESSFUL: Job '${env.JOB_NAME}' [Build #${env.BUILD_NUMBER}]",
                body: """<p>SUCCESS: Job '${env.JOB_NAME}' [Build #${env.BUILD_NUMBER}] completed successfully.</p>
                         <p>The build is live at port: <strong>${DYNAMIC_PORT}</strong></p>
                         <p>Check the console output here: <a href='${env.BUILD_URL}'>${env.JOB_NAME} Build #${env.BUILD_NUMBER}</a></p>""",
                to: 'uva77@gmail.com',
                mimeType: 'text/html'
            )
        }
        
        failure {
            // Integrated failure email alert
            emailext (
                subject: "FAILED: Job '${env.JOB_NAME}' [Build #${env.BUILD_NUMBER}]",
                body: """<p>FAILURE: Job '${env.JOB_NAME}' [Build #${env.BUILD_NUMBER}] has failed during execution.</p>
                         <p>Check the console output here to debug: <a href='${env.BUILD_URL}console'>Console Output</a></p>""",
                to: 'uva77@gmail.com',
                mimeType: 'text/html'
            )
        }
        
        cleanup {
            // Remove unused docker images to save disk space on the Amazon Linux slave
            sh "docker image prune -f"
        }
    }
}
