-- users table
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- social_accounts table
CREATE TABLE public.social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  account_id TEXT,
  username TEXT,
  profile_picture TEXT,
  access_token TEXT,
  token_expiry TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own social accounts"
  ON public.social_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own social accounts"
  ON public.social_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own social accounts"
  ON public.social_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own social accounts"
  ON public.social_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- account_insights table
CREATE TABLE public.account_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  social_account_id uuid REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  followers INTEGER,
  engagement_rate NUMERIC,
  posts_count INTEGER,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS
ALTER TABLE public.account_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view insights for their own accounts"
  ON public.account_insights FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.social_accounts sa
      WHERE sa.id = social_account_id
      AND sa.user_id = auth.uid()
    )
  );

-- posts table (the content itself — platform-agnostic)
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  media_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','scheduled','published','failed')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- trigger: update updated_at on post modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own posts"
  ON public.posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own posts"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
  ON public.posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON public.posts FOR DELETE
  USING (auth.uid() = user_id);

-- post_targets table (which accounts to publish to — one row per platform per post)
-- e.g. one post → Instagram row + Facebook row
CREATE TABLE public.post_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  social_account_id uuid REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',         -- pending | published | failed
  published_at TIMESTAMP WITH TIME ZONE, -- when it was actually published on that platform
  error_message TEXT,                    -- if failed, why
  UNIQUE(post_id, social_account_id)     -- prevent duplicate targets
);

-- RLS
ALTER TABLE public.post_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own post targets"
  ON public.post_targets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own post targets"
  ON public.post_targets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_id AND p.user_id = auth.uid()
    )
  );

-- profiles table (linked to Supabase auth.users)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  email_verified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- RLS enable
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Allow profile creation"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

-- trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, email_verified)
  VALUES (new.id, new.email, new.email_confirmed_at IS NOT NULL);
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- trigger: sync email verification status
CREATE OR REPLACE FUNCTION public.sync_email_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET email_verified = true
  WHERE id = new.id;
  RETURN new;
END;
$$;

CREATE TRIGGER on_email_verified
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (new.email_confirmed_at IS NOT NULL)
  EXECUTE PROCEDURE public.sync_email_verification();

-- AI Insights Table
create table ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  suggestion text,
  created_at timestamp default now()
);

-- Automation Logs Table
create table automation_logs (
  id uuid primary key default gen_random_uuid(),
  action text,
  status text,
  metadata jsonb,
  created_at timestamp default now()
);

create index idx_posts_user on posts(user_id);
create index idx_post_targets_post on post_targets(post_id);
create index idx_insights_account on account_insights(social_account_id);

DROP TABLE users;

--Create media table:
CREATE TABLE media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  type TEXT DEFAULT 'image',
  storage_path TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add page_access_token to social_accounts table:
ALTER TABLE social_accounts ADD COLUMN page_access_token TEXT;

-- Add RLS policies for media table:
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own media"
  ON public.media FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.user_id = auth.uid()));
CREATE POLICY "Users can insert their own media"
  ON public.media FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.user_id = auth.uid()));
CREATE POLICY "Users can delete their own media"
  ON public.media FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.user_id = auth.uid()));