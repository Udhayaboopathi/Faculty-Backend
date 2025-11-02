pipeline {
  agent any
  environment {
    DOCKER_IMAGE    = 'faculty-backend'
    // DOCKER_REGISTRY = 'ghcr.io
  }

  stages {
    stage('Checkout') {
      when { branch 'develop' }
      steps {
        git branch: 'develop',
            credentialsId: 'GITHUB_SECRET',
            url: 'https://github.com/snagarajan0209/Faculty-Backend.git'
      }
    }

    stage('Build') {
      steps {
        sh 'docker build -t $DOCKER_IMAGE .'
      }
    }

    // stage('Login to Registry') {
    //   steps {
    //     withCredentials([usernamePassword(
    //       credentialsId:   'GITHUB_SECRET',
    //       usernameVariable: 'USERNAME',
    //       passwordVariable: 'PASSWORD'
    //     )]) {
    //       sh 'echo $PASSWORD | docker login $DOCKER_REGISTRY -u $USERNAME --password-stdin'
    //     }
    //   }
    // }

//     stage('Push') {
//       steps {
//         sh 'docker push $DOCKER_REGISTRY/$DOCKER_IMAGE:latest'
//       }
//     }
//   }

  post {
    always {
      echo "Pipeline finished at ${new Date().format("yyyy-MM-dd HH:mm:ss")}"
    }
    success {
      echo "✅ Build succeeded! Image pushed: ${DOCKER_REGISTRY}/${DOCKER_IMAGE}:latest"
    }
    failure {
      echo "❌ Build failed!"
    }
  }
// # build finished check now....
}