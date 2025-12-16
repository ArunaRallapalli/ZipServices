--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: update_service_posts_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_service_posts_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: service_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_categories (
    category_id integer NOT NULL,
    category_name character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: active_service_categories; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.active_service_categories AS
 SELECT category_id,
    category_name,
    description,
    display_order
   FROM public.service_categories
  WHERE (is_active = true)
  ORDER BY display_order, category_name;


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings (
    booking_id integer NOT NULL,
    customer_id integer,
    business_id integer,
    service_id integer,
    booking_date timestamp without time zone NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    CONSTRAINT bookings_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: bookings_booking_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bookings_booking_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bookings_booking_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bookings_booking_id_seq OWNED BY public.bookings.booking_id;


--
-- Name: business_owners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_owners (
    business_id integer NOT NULL,
    user_id bigint,
    business_name character varying(150),
    service_category character varying(100),
    description text,
    phone_number character varying(20),
    zip_code character varying(10) NOT NULL,
    service_radius_miles integer DEFAULT 12,
    street character varying(255),
    city character varying(100),
    state character varying(50),
    CONSTRAINT business_owners_service_radius_miles_check CHECK ((service_radius_miles > 0))
);


--
-- Name: business_owners_business_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.business_owners_business_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: business_owners_business_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.business_owners_business_id_seq OWNED BY public.business_owners.business_id;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    customer_id integer NOT NULL,
    user_id integer,
    phone_number character varying(20),
    zip_code character varying(10) NOT NULL,
    full_name character varying(255),
    service_needed character varying(255)
);


--
-- Name: customers_customer_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customers_customer_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customers_customer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customers_customer_id_seq OWNED BY public.customers.customer_id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    sender_id bigint NOT NULL,
    receiver_id bigint NOT NULL,
    message_text text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: password_resets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_resets (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    reset_token character(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false
);


--
-- Name: password_resets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.password_resets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: password_resets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.password_resets_id_seq OWNED BY public.password_resets.id;


--
-- Name: service_categories_category_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.service_categories_category_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: service_categories_category_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.service_categories_category_id_seq OWNED BY public.service_categories.category_id;


--
-- Name: service_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_posts (
    id integer NOT NULL,
    user_id bigint NOT NULL,
    poster_type character varying(20) NOT NULL,
    post_type character varying(20) NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    service_category character varying(100) NOT NULL,
    price_range character varying(50),
    zip_code character varying(10) NOT NULL,
    phone_number character varying(20),
    contact_email character varying(255),
    is_active boolean DEFAULT true,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    category_id integer,
    city character varying(100),
    state character varying(50),
    CONSTRAINT service_posts_post_type_check CHECK (((post_type)::text = ANY ((ARRAY['request'::character varying, 'offer'::character varying])::text[]))),
    CONSTRAINT service_posts_poster_type_check CHECK (((poster_type)::text = ANY ((ARRAY['customer'::character varying, 'business_owner'::character varying, 'guest'::character varying])::text[]))),
    CONSTRAINT service_posts_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'closed'::character varying, 'deleted'::character varying])::text[])))
);


--
-- Name: service_posts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.service_posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: service_posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.service_posts_id_seq OWNED BY public.service_posts.id;


--
-- Name: services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.services (
    service_id integer NOT NULL,
    business_id integer,
    service_name character varying(100) NOT NULL,
    price numeric(10,2),
    description text,
    category_id integer
);


--
-- Name: services_service_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.services_service_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: services_service_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.services_service_id_seq OWNED BY public.services.service_id;


--
-- Name: user_devices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_devices (
    id integer NOT NULL,
    user_id bigint,
    device_token text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: user_devices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_devices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_devices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_devices_id_seq OWNED BY public.user_devices.id;


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    session_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id bigint NOT NULL,
    ip_address inet,
    device_info text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp with time zone
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    user_id bigint NOT NULL,
    user_type character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    password character varying(255),
    email character varying(255),
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    full_name character varying(255),
    CONSTRAINT user_type_check CHECK (((user_type)::text = ANY ((ARRAY['customer'::character varying, 'business_owner'::character varying])::text[])))
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.user_id;


--
-- Name: bookings booking_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings ALTER COLUMN booking_id SET DEFAULT nextval('public.bookings_booking_id_seq'::regclass);


--
-- Name: business_owners business_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_owners ALTER COLUMN business_id SET DEFAULT nextval('public.business_owners_business_id_seq'::regclass);


--
-- Name: customers customer_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers ALTER COLUMN customer_id SET DEFAULT nextval('public.customers_customer_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: password_resets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_resets ALTER COLUMN id SET DEFAULT nextval('public.password_resets_id_seq'::regclass);


--
-- Name: service_categories category_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_categories ALTER COLUMN category_id SET DEFAULT nextval('public.service_categories_category_id_seq'::regclass);


--
-- Name: service_posts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_posts ALTER COLUMN id SET DEFAULT nextval('public.service_posts_id_seq'::regclass);


--
-- Name: services service_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services ALTER COLUMN service_id SET DEFAULT nextval('public.services_service_id_seq'::regclass);


--
-- Name: user_devices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_devices ALTER COLUMN id SET DEFAULT nextval('public.user_devices_id_seq'::regclass);


--
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (booking_id);


--
-- Name: business_owners business_owners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_owners
    ADD CONSTRAINT business_owners_pkey PRIMARY KEY (business_id);


--
-- Name: business_owners business_owners_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_owners
    ADD CONSTRAINT business_owners_user_id_key UNIQUE (user_id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (customer_id);


--
-- Name: customers customers_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_user_id_key UNIQUE (user_id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: password_resets password_resets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_pkey PRIMARY KEY (id);


--
-- Name: password_resets password_resets_reset_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_reset_token_key UNIQUE (reset_token);


--
-- Name: service_categories service_categories_category_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_categories
    ADD CONSTRAINT service_categories_category_name_key UNIQUE (category_name);


--
-- Name: service_categories service_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_categories
    ADD CONSTRAINT service_categories_pkey PRIMARY KEY (category_id);


--
-- Name: service_posts service_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_posts
    ADD CONSTRAINT service_posts_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (service_id);


--
-- Name: user_devices user_devices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_devices
    ADD CONSTRAINT user_devices_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (session_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: idx_service_posts_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_posts_category ON public.service_posts USING btree (service_category);


--
-- Name: idx_service_posts_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_posts_created_at ON public.service_posts USING btree (created_at DESC);


--
-- Name: idx_service_posts_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_posts_is_active ON public.service_posts USING btree (is_active);


--
-- Name: idx_service_posts_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_posts_location ON public.service_posts USING btree (zip_code, city, state);


--
-- Name: idx_service_posts_post_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_posts_post_type ON public.service_posts USING btree (post_type);


--
-- Name: idx_service_posts_poster_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_posts_poster_type ON public.service_posts USING btree (poster_type);


--
-- Name: idx_service_posts_service_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_posts_service_category ON public.service_posts USING btree (service_category);


--
-- Name: idx_service_posts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_posts_status ON public.service_posts USING btree (status);


--
-- Name: idx_service_posts_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_posts_user_id ON public.service_posts USING btree (user_id);


--
-- Name: idx_service_posts_zip_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_posts_zip_code ON public.service_posts USING btree (zip_code);


--
-- Name: service_posts service_posts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER service_posts_updated_at BEFORE UPDATE ON public.service_posts FOR EACH ROW EXECUTE FUNCTION public.update_service_posts_updated_at();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bookings bookings_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owners(business_id) ON DELETE CASCADE;


--
-- Name: bookings bookings_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE CASCADE;


--
-- Name: bookings bookings_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(service_id);


--
-- Name: business_owners business_owners_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_owners
    ADD CONSTRAINT business_owners_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: customers customers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: password_resets password_resets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: service_posts service_posts_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_posts
    ADD CONSTRAINT service_posts_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.service_categories(category_id);


--
-- Name: service_posts service_posts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_posts
    ADD CONSTRAINT service_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: services services_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owners(business_id) ON DELETE CASCADE;


--
-- Name: services services_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.service_categories(category_id);


--
-- Name: user_devices user_devices_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_devices
    ADD CONSTRAINT user_devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

