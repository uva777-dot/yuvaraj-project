pipeline {
    // This tells Jenkins to run the work on your Amazon Linux slave
    agent { 
        label 'nodejs-worker' 
    }

    environment {
        IMAGE_NAME = "node-shopping-app"
        // Correct way to handle credentials and strings in the environment block
        MONGO_CREDS = credentials('mongodb-atlas-creds')
        MONGO_DB   = "shop"
        // We calculate the port using the build ID
        DYNAMIC_PORT = "${7000 + env.BUILD_ID.toInteger()}"
    }

    stages {
        stage('Cleanup Environment') {
            steps {
                script {
                    // Remove existing containers on the dynamic port or with the same name
                    sh "docker ps -q --filter publish=${DYNAMIC_PORT} | xargs -r docker rm -f"
                    sh "docker rm -f container_${env.BUILD_NUMBER} || true"
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                sh "docker build -t ${IMAGE_NAME}:v${env.BUILD_NUMBER} ."
            }
        }

        stage('Run Dynamic Container') {
            steps {
                script {
                    echo "Deploying to Port: ${DYNAMIC_PORT}"
                    // Note the triple quotes for multi-line shell and variable injection
                    sh """
                    docker run -d \
                      --name container_${env.BUILD_NUMBER} \
                      -p ${DYNAMIC_PORT}:7000 \
                      -e MONGO_USER=${MONGO_CREDS_USR} \
                      -e MONGO_PWD=${MONGO_CREDS_PSW} \
                      -e MONGO_DB=${MONGO_DB} \
                      -e PORT=7000 \
                      ${IMAGE_NAME}:v${env.BUILD_NUMBER}
                    """
                }
            }
        }

        stage('Health Check') {
            steps {
                sleep 20
                sh "curl -f http://localhost:${DYNAMIC_PORT} || exit 1"
            }
        }
    }

    post {
        success {
            echo "Build #${env.BUILD_NUMBER} is live at port ${DYNAMIC_PORT}"
        }
        always {
            sh "docker image prune -f"
        }
    }
}
