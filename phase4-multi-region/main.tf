terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Configure AWS provider for each region
provider "aws" {
  alias  = "us_east"
  region = "us-east-1"
}

provider "aws" {
  alias  = "eu_west"
  region = "eu-west-1"
}

provider "aws" {
  alias  = "ap_southeast"
  region = "ap-southeast-1"
}

# Global resources (us-east-1)
resource "aws_route53_health_check" "global" {
  provider = aws.us_east

  fqdn              = "api.gamev1.com"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/healthz"
  failure_threshold = "3"
  request_interval  = "30"

  tags = {
    Name = "gamev1-global-health-check"
  }
}

# Regional load balancers
resource "aws_lb" "us_east" {
  provider = aws.us_east

  name               = "gamev1-lb-us-east"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.gamev1_web.id]
  subnets            = data.aws_subnets.public.ids

  enable_deletion_protection = true

  access_logs {
    bucket  = aws_s3_bucket.lb_logs.bucket
    prefix  = "us-east"
    enabled = true
  }
}

resource "aws_lb" "eu_west" {
  provider = aws.eu_west

  name               = "gamev1-lb-eu-west"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.gamev1_web.id]
  subnets            = data.aws_subnets.public.ids

  enable_deletion_protection = true

  access_logs {
    bucket  = aws_s3_bucket.lb_logs.bucket
    prefix  = "eu-west"
    enabled = true
  }
}

# Auto scaling groups
resource "aws_autoscaling_group" "gateway_us_east" {
  provider = aws.us_east

  name                      = "gamev1-gateway-us-east"
  max_size                  = 10
  min_size                  = 2
  desired_capacity          = 3
  health_check_grace_period = 300
  health_check_type         = "ELB"

  launch_template {
    id      = aws_launch_template.gateway.id
    version = ""
  }

  target_group_arns = [aws_lb_target_group.gateway.arn]

  tag {
    key                 = "Name"
    value               = "gamev1-gateway"
    propagate_at_launch = true
  }
}

# CloudFront distribution
resource "aws_cloudfront_distribution" "global" {
  provider = aws.us_east

  origin {
    domain_name = aws_lb.us_east.dns_name
    origin_id   = "gamev1-regional-origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "GameV1 Global CDN"
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "gamev1-regional-origin"

    forwarded_values {
      query_string = true
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.global.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}
