#!/bin/bash

echo "🚀 Setting up Docker in WSL for Smart Contract Build"
echo "=================================================="

# Update package list
echo "📦 Updating package list..."
sudo apt update

# Install prerequisites
echo "🔧 Installing prerequisites..."
sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
echo "🔑 Adding Docker GPG key..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "📚 Adding Docker repository..."
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
echo "🐳 Installing Docker..."
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Start Docker service
echo "▶️ Starting Docker service..."
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
echo "👤 Adding user to docker group..."
sudo usermod -aG docker $USER

echo "✅ Docker installation completed!"
echo "📝 Note: You may need to restart your WSL session for group changes to take effect"
echo "🔄 Run: wsl --shutdown then wsl to restart"




