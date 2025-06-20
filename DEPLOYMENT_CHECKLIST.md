# Deployment Checklist

## Pre-Deployment

### Code Preparation
- [ ] All tests passing locally
- [ ] No console.log statements in production code
- [ ] Environment variables documented
- [ ] Dependencies up to date
- [ ] Build succeeds locally
- [ ] No hardcoded secrets or API keys

### Accounts Setup
- [ ] GitHub repository created/updated
- [ ] Vercel account created
- [ ] Render.com account created
- [ ] Stripe account created and configured
- [ ] Anthropic API key obtained

## Backend Deployment (Render.com)

### Database Setup
- [ ] PostgreSQL database created
- [ ] Connection string saved
- [ ] Database region noted

### Redis Setup
- [ ] Redis instance created
- [ ] Connection string saved
- [ ] Maxmemory policy set to `allkeys-lru`

### Backend Service
- [ ] Repository connected to Render
- [ ] Build command set: `./build.sh`
- [ ] Start command set: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- [ ] Root directory set: `backend/core`
- [ ] Python version specified in `runtime.txt`

### Environment Variables (Backend)
- [ ] `ENVIRONMENT` = production
- [ ] `DEBUG` = false
- [ ] `SECRET_KEY` generated (32+ chars)
- [ ] `DATABASE_URL` from PostgreSQL
- [ ] `REDIS_URL` from Redis
- [ ] `ANTHROPIC_API_KEY` added
- [ ] `STRIPE_SECRET_KEY` added
- [ ] `STRIPE_WEBHOOK_SECRET` added
- [ ] `STRIPE_PRICE_ID_PRO_MONTHLY` added
- [ ] `STRIPE_PRICE_ID_PRO_YEARLY` added
- [ ] `FRONTEND_URL` set
- [ ] `BACKEND_CORS_ORIGINS` includes frontend URL

### Post-Backend Deployment
- [ ] Service deployed successfully
- [ ] Health check endpoint responding
- [ ] Database migrations run
- [ ] Logs checked for errors

## Frontend Deployment (Vercel)

### Pre-Deployment
- [ ] API URL updated in code
- [ ] Build succeeds locally
- [ ] Environment variables prepared

### Vercel Setup
- [ ] Project created/imported
- [ ] Domain configured (optional)
- [ ] Build settings confirmed

### Environment Variables (Frontend)
- [ ] `NEXT_PUBLIC_API_URL` set to backend URL
- [ ] `NEXTAUTH_URL` set to frontend URL
- [ ] `NEXTAUTH_SECRET` generated (32+ chars)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` added

### Post-Frontend Deployment
- [ ] Deployment successful
- [ ] Site accessible
- [ ] API calls working
- [ ] Authentication working

## Stripe Configuration

### Webhook Setup
- [ ] Webhook endpoint added: `/api/v1/subscription/webhook`
- [ ] Events selected:
  - [ ] `checkout.session.completed`
  - [ ] `invoice.paid`
  - [ ] `invoice.payment_failed`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
- [ ] Webhook secret copied to environment
- [ ] Webhook tested

### Products & Pricing
- [ ] Products created in Stripe
- [ ] Monthly price created
- [ ] Yearly price created
- [ ] Price IDs added to environment

## Post-Deployment Testing

### Basic Functionality
- [ ] Homepage loads
- [ ] User can sign up
- [ ] Email verification works
- [ ] User can sign in
- [ ] User can sign out

### Core Features
- [ ] Project creation works
- [ ] File upload works
- [ ] File editing works
- [ ] AI chat responds
- [ ] Code generation works

### Payment Flow
- [ ] Pricing page displays correctly
- [ ] Checkout process works
- [ ] Subscription activates
- [ ] Billing portal accessible

### Security
- [ ] HTTPS enforced
- [ ] Security headers present
- [ ] Authentication required for API
- [ ] Rate limiting active

## Monitoring Setup

### Render.com
- [ ] Metrics dashboard reviewed
- [ ] Alerts configured
- [ ] Auto-scaling configured (if needed)

### Vercel
- [ ] Analytics enabled
- [ ] Performance monitoring active
- [ ] Error tracking configured

### External Monitoring
- [ ] Uptime monitoring configured
- [ ] Error tracking service connected (e.g., Sentry)
- [ ] Performance monitoring active

## Final Checks

### Documentation
- [ ] README updated with production URLs
- [ ] API documentation current
- [ ] Deployment guide reviewed

### Backup & Recovery
- [ ] Database backups enabled
- [ ] Backup restoration tested
- [ ] Disaster recovery plan documented

### Legal & Compliance
- [ ] Privacy policy updated
- [ ] Terms of service updated
- [ ] Cookie policy implemented
- [ ] GDPR compliance verified

## Launch

- [ ] Team notified
- [ ] Social media announcement prepared
- [ ] Support channels ready
- [ ] Monitoring dashboards open
- [ ] 🚀 **GO LIVE!**

## Post-Launch (First 24 Hours)

- [ ] Monitor error logs
- [ ] Check performance metrics
- [ ] Respond to user feedback
- [ ] Address any critical issues
- [ ] Celebrate! 🎉