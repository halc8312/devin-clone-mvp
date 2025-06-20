# Deployment Guide

This guide explains how to deploy the Devin Clone MVP to production using Vercel (frontend) and Render.com (backend).

## Prerequisites

- GitHub account with the project repository
- Vercel account
- Render.com account
- Stripe account (for payments)
- Anthropic API key (for Claude AI)
- PostgreSQL database
- Redis instance

## Backend Deployment (Render.com)

### 1. Database Setup

1. Create a new PostgreSQL database on Render.com:
   - Go to Dashboard > New > PostgreSQL
   - Name: `devin-clone-db`
   - Plan: Starter (or higher for production)
   - Region: Choose closest to your users

2. Note the connection string for later use.

### 2. Redis Setup

1. Create a new Redis instance:
   - Go to Dashboard > New > Redis
   - Name: `devin-clone-redis`
   - Plan: Starter
   - Maxmemory Policy: `allkeys-lru`

### 3. Backend Service Deployment

1. Fork/clone this repository to your GitHub account

2. In Render.com:
   - Go to Dashboard > New > Web Service
   - Connect your GitHub repository
   - Select the repository and branch

3. Configure the service:
   ```
   Name: devin-clone-api
   Region: Same as database
   Branch: main
   Root Directory: backend/core
   Runtime: Python 3
   Build Command: ./build.sh
   Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```

4. Add environment variables:
   ```
   ENVIRONMENT=production
   DEBUG=false
   SECRET_KEY=[generate a strong secret key]
   DATABASE_URL=[from PostgreSQL setup]
   REDIS_URL=[from Redis setup]
   ANTHROPIC_API_KEY=[your Anthropic API key]
   CLAUDE_MODEL=claude-3-5-sonnet-20241022
   STRIPE_SECRET_KEY=[your Stripe secret key]
   STRIPE_WEBHOOK_SECRET=[from Stripe webhook setup]
   STRIPE_PRICE_ID_PRO_MONTHLY=[your monthly price ID]
   STRIPE_PRICE_ID_PRO_YEARLY=[your yearly price ID]
   FRONTEND_URL=https://your-app.vercel.app
   BACKEND_CORS_ORIGINS=https://your-app.vercel.app
   ```

5. Deploy the service

### 4. Set up Stripe Webhook

1. In Stripe Dashboard:
   - Go to Developers > Webhooks
   - Add endpoint: `https://your-api.onrender.com/api/v1/subscription/webhook`
   - Select events:
     - `checkout.session.completed`
     - `invoice.paid`
     - `invoice.payment_failed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`

2. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

## Frontend Deployment (Vercel)

### 1. Prepare the Frontend

1. Update `frontend/vercel.json` with your API URL:
   ```json
   {
     "rewrites": [
       {
         "source": "/api/v1/:path*",
         "destination": "https://your-api.onrender.com/api/v1/:path*"
       }
     ]
   }
   ```

### 2. Deploy to Vercel

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. In the frontend directory:
   ```bash
   cd frontend
   vercel
   ```

3. Follow the prompts:
   - Link to existing project or create new
   - Select the team (if applicable)
   - Confirm project settings

4. Set environment variables in Vercel Dashboard:
   ```
   NEXT_PUBLIC_API_URL=https://your-api.onrender.com
   NEXTAUTH_URL=https://your-app.vercel.app
   NEXTAUTH_SECRET=[generate a strong secret]
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=[your Stripe publishable key]
   ```

5. Deploy:
   ```bash
   vercel --prod
   ```

## Post-Deployment Steps

### 1. Database Migrations

1. SSH into your Render service or use the Shell tab
2. Run migrations:
   ```bash
   alembic upgrade head
   ```

### 2. Create Admin User (Optional)

```bash
python -m app.scripts.create_admin --email admin@example.com --password YourSecurePassword
```

### 3. Test the Deployment

1. Visit your frontend URL
2. Create a test account
3. Test key features:
   - Authentication
   - Project creation
   - File upload/edit
   - AI chat
   - Payment flow

### 4. Monitor Services

- Set up monitoring in Render.com dashboard
- Configure alerts for downtime
- Monitor logs for errors

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure `BACKEND_CORS_ORIGINS` includes your frontend URL
   - Check that the URL doesn't have trailing slashes

2. **Database Connection Issues**
   - Verify `DATABASE_URL` is correct
   - Check that the database is in the same region

3. **Payment Issues**
   - Verify Stripe keys are correct
   - Ensure webhook endpoint is accessible
   - Check webhook signing secret

4. **File Upload Issues**
   - Check file size limits
   - Verify storage permissions

### Performance Optimization

1. **Enable Caching**
   - Redis is configured for caching
   - Adjust cache TTL as needed

2. **Database Optimization**
   - Add indexes for frequently queried fields
   - Monitor slow queries

3. **CDN Setup**
   - Vercel automatically provides CDN
   - Consider Cloudflare for additional caching

## Scaling Considerations

### When to Scale

- Database CPU consistently > 80%
- Redis memory usage > 80%
- API response times > 1s
- Frequent 502/503 errors

### Scaling Options

1. **Vertical Scaling**
   - Upgrade Render.com plan
   - Increase database resources
   - Upgrade Redis instance

2. **Horizontal Scaling**
   - Enable autoscaling on Render
   - Use read replicas for database
   - Implement queue system for heavy tasks

## Security Checklist

- [ ] All secrets are stored as environment variables
- [ ] HTTPS is enforced
- [ ] Database has strong password
- [ ] Redis has authentication enabled
- [ ] Rate limiting is configured
- [ ] Security headers are set
- [ ] Regular backups are configured
- [ ] Monitoring is active

## Backup and Recovery

1. **Database Backups**
   - Render.com provides automatic daily backups
   - Configure point-in-time recovery if needed

2. **File Backups**
   - Consider S3 for file storage
   - Implement regular backup routine

3. **Disaster Recovery**
   - Document recovery procedures
   - Test restore process regularly
   - Keep configuration backed up

## Maintenance

### Regular Tasks

1. **Weekly**
   - Review error logs
   - Check performance metrics
   - Monitor disk usage

2. **Monthly**
   - Update dependencies
   - Review security alerts
   - Optimize database

3. **Quarterly**
   - Security audit
   - Performance review
   - Cost optimization

## Support

For deployment issues:
- Render.com: support@render.com
- Vercel: support@vercel.com
- Project: [GitHub Issues](https://github.com/yourusername/devin-clone-mvp/issues)