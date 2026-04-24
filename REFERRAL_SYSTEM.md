# Referral System with Points Documentation

This document explains how the referral system with points rewards works in LifeLink.

## System Overview

The referral system allows users to earn and share referral codes with friends and family. When someone signs up using a referral code:

- **Referrer** earns **10 points**
- **Referred user** earns **5 bonus points**

Points are awarded immediately upon signup (no email verification required).

## Database Schema

### Tables

#### `referrals`
Tracks relationships between referrers and referred users.

- `id` - UUID (Primary Key)
- `referrer_id` - UUID (Foreign Key to auth.users)
- `referred_user_id` - UUID (Foreign Key to auth.users, unique)
- `status` - ENUM ('pending', 'completed') - defaults to 'completed' on signup
- `joined_at` - TIMESTAMPTZ - timestamp when referred user joined
- `created_at` - TIMESTAMPTZ
- `updated_at` - TIMESTAMPTZ

**Indexes:**
- `idx_referrals_referrer` - for querying referrer's referrals
- `idx_referrals_referred` - for checking if user was referred

#### `user_points`
Stores user points and referral statistics.

- `id` - UUID (Primary Key)
- `user_id` - UUID (Foreign Key to auth.users, unique)
- `balance` - INTEGER - current points balance
- `points_earned` - INTEGER - total points ever earned
- `points_redeemed` - INTEGER - total points ever spent (for future redemption)
- `referral_count` - INTEGER - number of successful referrals made
- `created_at` - TIMESTAMPTZ
- `updated_at` - TIMESTAMPTZ

**Indexes:**
- `idx_user_points_balance` - for leaderboards
- `idx_user_points_user_id` - for user lookups

#### `profiles`
Enhanced with:
- `referral_code` - TEXT (UNIQUE) - user's referral code (auto-generated)

### Functions

#### `generate_referral_code()`
Generates a unique 6-character alphanumeric code.

#### `award_referrer_points(_referrer_id uuid)`
Awards 10 points to the referrer and increments their referral count.

#### `award_referred_user_points(_referred_user_id uuid)`
Awards 5 points to the referred user for signing up.

#### `track_referral_with_points(_referrer_code text, _referred_user_id uuid)`
Atomic function that:
1. Finds referrer by code
2. Validates referral (no self-referrals, no duplicate referrals)
3. Creates referral record
4. Awards points to both users

Returns: `{ referral_id, referrer_id, success }`

#### `get_user_referral_stats(_user_id uuid)`
Fetches comprehensive referral statistics for a user.

Returns:
- `total_referrals` - number of successful referrals
- `points_balance` - current points
- `points_earned` - total points earned
- `referral_code` - their unique referral code
- `referred_user_count` - count of active referrals

## Frontend Implementation

### Hooks

#### `useReferralCapture()`
Automatically captures `?ref=CODE` from URL query params on app load and processes the referral when user signs up.

#### `useReferralStats()`
Fetches user's referral statistics and referral code.

Returns: `{ stats, loading, error }`

#### `useUserPoints()`
Fetches user's points record.

Returns: `{ points, loading, error }`

### Library Functions

#### `src/lib/referral.ts`
- `captureReferralFromUrl()` - Extract code from URL query params
- `getStoredReferralCode()` - Get code from localStorage
- `clearStoredReferralCode()` - Clear code from localStorage
- `buildReferralLink(code)` - Build shareable referral link
- `processReferral(userId)` - Process referral on signup and award points
- `getUserReferralStats(userId)` - Fetch referral stats
- `getUserPoints(userId)` - Fetch user's points
- `getUserReferralCode(userId)` - Get user's referral code

#### `src/lib/points.ts`
- `getUserPointsBalance(userId)` - Get current points balance
- `getUserPointsRecord(userId)` - Get complete points record
- `getPointsLeaderboard(limit)` - Get top users by points
- `formatPoints(points)` - Format points for display
- `subscribeToPointsChanges(userId, callback)` - Real-time points updates

### Components

#### `ReferralCodeCard`
Displays user's referral code with copy and share buttons.

Props:
- `code` - string | null
- `isLoading` - boolean (optional)

#### `ReferralStats`
Shows stats cards: referrals, current points, earned points.

Props:
- `totalReferrals` - number
- `pointsBalance` - number
- `pointsEarned` - number
- `isLoading` - boolean (optional)

#### `PointsBadge`
Small badge showing current points balance (for header/nav).

#### `PointsDisplay`
Larger points display for dashboard/profile.

## Setup Instructions

### 1. Database Migration

The migration file is located at:
```
supabase/migrations/20260424120000_add_points_system.sql
```

To apply the migration:

```bash
# Using Supabase CLI
supabase db push

# Or through the Supabase dashboard:
# 1. Go to SQL Editor
# 2. Create a new query
# 3. Paste contents of the migration file
# 4. Run the query
```

### 2. Update Supabase Types

TypeScript types are already updated in `src/integrations/supabase/types.ts` to include:
- `user_points` table
- New functions: `track_referral_with_points`, `award_referrer_points`, etc.
- `get_user_referral_stats` function

### 3. Usage Flow

**For new users:**

1. User clicks referral link: `https://app.com/auth?mode=signup&ref=ABC123`
2. `useReferralCapture` hook captures the code
3. User completes signup via `Auth.tsx`
4. On successful signup, `processReferral()` is called
5. Points are awarded to both referrer and referred user

**For existing users:**

1. User navigates to `/invite`
2. Page displays their unique referral code and stats
3. They can copy code, share link, or use social share
4. Each successful referral earns them 10 points

## Testing

### Test Referral Flow Locally

```javascript
// In browser console
localStorage.setItem('lifelink:ref:v1', 'TEST01');
// Sign up as new user
// Check Supabase: should see referral record and user_points entries
```

### Check Points Manually

```sql
-- In Supabase SQL Editor
SELECT * FROM public.user_points;
SELECT * FROM public.referrals;
```

### Test Real-time Updates

```javascript
// Subscribe to points changes
import { subscribeToPointsChanges } from '@/lib/points';
const subscription = subscribeToPointsChanges(userId, (data) => {
  console.log('Points updated:', data);
});
```

## Security

- **RLS Policies**: All tables have row-level security enabled
- **User Isolation**: Users can only see their own points and referrals
- **Atomic Transactions**: Point awards and referral tracking happen atomically
- **Code Validation**: Referral codes are validated before processing
- **Self-Referral Prevention**: Users cannot refer themselves

## Future Enhancements

- Points redemption system (redeem points for features)
- Referral tiers (bonus points at milestones)
- Team referral tracking
- Referral analytics dashboard
- Email notifications for referrals
- Leaderboard display
