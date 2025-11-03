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
-- Name: update_service_posts_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_service_posts_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_service_posts_updated_at() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: service_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.service_categories (
    category_id integer NOT NULL,
    category_name character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.service_categories OWNER TO postgres;

--
-- Name: active_service_categories; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.active_service_categories AS
 SELECT category_id,
    category_name,
    description,
    display_order
   FROM public.service_categories
  WHERE (is_active = true)
  ORDER BY display_order, category_name;


ALTER VIEW public.active_service_categories OWNER TO postgres;

--
-- Name: bookings; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.bookings OWNER TO postgres;

--
-- Name: bookings_booking_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bookings_booking_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bookings_booking_id_seq OWNER TO postgres;

--
-- Name: bookings_booking_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bookings_booking_id_seq OWNED BY public.bookings.booking_id;


--
-- Name: business_owners; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.business_owners OWNER TO postgres;

--
-- Name: business_owners_business_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.business_owners_business_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.business_owners_business_id_seq OWNER TO postgres;

--
-- Name: business_owners_business_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.business_owners_business_id_seq OWNED BY public.business_owners.business_id;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customers (
    customer_id integer NOT NULL,
    user_id integer,
    phone_number character varying(20),
    zip_code character varying(10) NOT NULL,
    full_name character varying(255),
    service_needed character varying(255)
);


ALTER TABLE public.customers OWNER TO postgres;

--
-- Name: customers_customer_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.customers_customer_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customers_customer_id_seq OWNER TO postgres;

--
-- Name: customers_customer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.customers_customer_id_seq OWNED BY public.customers.customer_id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    sender_id bigint NOT NULL,
    receiver_id bigint NOT NULL,
    message_text text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.messages_id_seq OWNER TO postgres;

--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: password_resets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_resets (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    reset_token character(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false
);


ALTER TABLE public.password_resets OWNER TO postgres;

--
-- Name: password_resets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.password_resets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_resets_id_seq OWNER TO postgres;

--
-- Name: password_resets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.password_resets_id_seq OWNED BY public.password_resets.id;


--
-- Name: service_categories_category_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.service_categories_category_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.service_categories_category_id_seq OWNER TO postgres;

--
-- Name: service_categories_category_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.service_categories_category_id_seq OWNED BY public.service_categories.category_id;


--
-- Name: service_posts; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.service_posts OWNER TO postgres;

--
-- Name: service_posts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.service_posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.service_posts_id_seq OWNER TO postgres;

--
-- Name: service_posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.service_posts_id_seq OWNED BY public.service_posts.id;


--
-- Name: services; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.services (
    service_id integer NOT NULL,
    business_id integer,
    service_name character varying(100) NOT NULL,
    price numeric(10,2),
    description text,
    category_id integer
);


ALTER TABLE public.services OWNER TO postgres;

--
-- Name: services_service_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.services_service_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.services_service_id_seq OWNER TO postgres;

--
-- Name: services_service_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.services_service_id_seq OWNED BY public.services.service_id;


--
-- Name: user_devices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_devices (
    id integer NOT NULL,
    user_id bigint,
    device_token text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.user_devices OWNER TO postgres;

--
-- Name: user_devices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_devices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_devices_id_seq OWNER TO postgres;

--
-- Name: user_devices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_devices_id_seq OWNED BY public.user_devices.id;


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_sessions (
    session_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id bigint NOT NULL,
    ip_address inet,
    device_info text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp with time zone
);


ALTER TABLE public.user_sessions OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.user_id;


--
-- Name: bookings booking_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings ALTER COLUMN booking_id SET DEFAULT nextval('public.bookings_booking_id_seq'::regclass);


--
-- Name: business_owners business_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_owners ALTER COLUMN business_id SET DEFAULT nextval('public.business_owners_business_id_seq'::regclass);


--
-- Name: customers customer_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers ALTER COLUMN customer_id SET DEFAULT nextval('public.customers_customer_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: password_resets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets ALTER COLUMN id SET DEFAULT nextval('public.password_resets_id_seq'::regclass);


--
-- Name: service_categories category_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_categories ALTER COLUMN category_id SET DEFAULT nextval('public.service_categories_category_id_seq'::regclass);


--
-- Name: service_posts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_posts ALTER COLUMN id SET DEFAULT nextval('public.service_posts_id_seq'::regclass);


--
-- Name: services service_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services ALTER COLUMN service_id SET DEFAULT nextval('public.services_service_id_seq'::regclass);


--
-- Name: user_devices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_devices ALTER COLUMN id SET DEFAULT nextval('public.user_devices_id_seq'::regclass);


--
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bookings (booking_id, customer_id, business_id, service_id, booking_date, status) FROM stdin;
\.


--
-- Data for Name: business_owners; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.business_owners (business_id, user_id, business_name, service_category, description, phone_number, zip_code, service_radius_miles, street, city, state) FROM stdin;
69	694	Fabulous catering	\N	\N	\N	85024	\N	123 via dona	phoenix	az
41	668	Lovable services	Decorations	Decorations for all occassions	\N	85024	12	2209 East menadota drive 	Phoenix 	Az 
64	636	Mounika services	Home Repair	\N	6023339999	85024	12	\N	\N	\N
65	637	Meena Services	Pet Care	\N	6023339999	85024	12	\N	\N	\N
66	639	Kuni services	Photography	\N	5053339999	85083	12	\N	\N	\N
71	697	Shrivardhan services	\N	\N	\N	85083	\N	2209 East menadota drive 	Phoenix	AZ
72	698	Rama	\N	\N	\N	85024	\N	3333 via dona road	Phoenix	AZ
26	172	Test Shop	Plumbing	Expert plumbing services	5551234567	90001	15	123 Main St	Sample City	CA
29	298	Venkateshwara	Appliance Repair	\N	\N	85260	12	16186 N 98thway	Scottsdale	AZ
30	305	Venkateshwara	Automative Repair	\N	\N	85260	12	16186 N 98th Way 	Scottsdale	az
33	452	AbrakaDabra	Event Planning 	rallapalli	\N	86083	\N	3237 W Via Dona RD	Phoenix	AZ
36	578	Divs	Beauty services	\N	\N	85024	\N	2209 meandota 	Phoenix	az
37	584	CakeCatering Service	Catering	\N	\N	85024	\N	333 menadota drive	Phoenix	AZ
38	586	Aruna Tutoring	Tutoring	\N	\N	85260	\N	16186 N 98th	scottsdale	AZ
27	175	Ganesha Services	Catering	food and Electrical services	4808610956	85083	12	3399 Via Dona road	Phoenix	AZ
40	667	ABC Tailoring services	Tailoring	Alterations 	\N	85024	\N	3333 Via Dona Road 	phoenix	az
60	532	Ramu	Cleaning	\N	6023339933	85024	12	\N	\N	\N
45	205	efg service	Pet Care	\N	1234567890	12345	12	\N	\N	\N
46	210	Anita	Moving	\N	6024593225	85083	12	\N	\N	\N
47	212	Sunita	Home Repair	\N	6023338888	85083	12	\N	\N	\N
48	231	Sireesha	Landscaping	\N	4808610956	85083	12	\N	\N	\N
49	294	Pranavi	Tech Support	\N	6023339999	85260	12	\N	\N	\N
50	295	Madhavi	Tailoring	\N	4803339999	85260	12	\N	\N	\N
51	296	Renuka	Other	\N	6233339999	85260	12	\N	\N	\N
52	400	Amitha	Other	\N	6028216532	85083	12	\N	\N	\N
53	430	Kamal 	Home Repair	\N	4803339999	85260	12	\N	\N	\N
55	443	Sidhu	Electrical	\N	6025955044	85083	12	\N	\N	\N
56	446	Harsha	Pet Care	\N	6025955044	85083	12	\N	\N	\N
61	615	Raj	Plumbing	\N	6028216532	85083	12	\N	\N	\N
62	565	Rosa	Moving	\N	6024593333	85024	12	\N	\N	\N
67	641	SriLakshmi	Beauty Services	\N	6023339999	85260	12	\N	\N	\N
68	207	Mahathi	Electrical	\N	4803339935	85260	12	\N	\N	\N
28	290	Lakshmi	Beauty services	Food 	4803339999	85024	33	3237 Via Donna Road	Phoenix	AZ
70	696	Lalitha	\N	\N	6023339999	85262	\N	3237 Scottsdale road 	Scottsdale	AZ
39	663	ABC Plumbing Services	Plumbing	\N	\N	85260	\N	2606 rue de vl	Tempe	AZ
31	421	Bname 	\N	\N	\N	85083	\N	3233	Phoenix	AZ
32	432	Miracle 	\N	\N	\N	85083	33	3299 via dona road	Phoenix	AZ
54	435	Alteration and other Services 	Electrical 	\N	6024593225	85083	12	\N	\N	\N
57	461	Misc services 	Pet Care	\N	4808610956	85083	12	\N	\N	\N
58	478	Srikar services	Photography	\N	4808610933	85024	12	\N	\N	\N
59	488	Saira services	TechSupport	\N	4803339999	85024	12	\N	\N	\N
63	623	Meera services	Other	\N	6023339999	85083	12	\N	\N	\N
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customers (customer_id, user_id, phone_number, zip_code, full_name, service_needed) FROM stdin;
17	205	1234567890	12345	John Doe	\N
19	210	6024593225	85083	Divyasri	\N
20	212	6023338888	85083	RitvikR	\N
21	231	4808610956	85083	Aruna Prabha	\N
22	294	6023339999	85260	Kavita	\N
23	295	4803339999	85260	Leela	\N
24	296	6233339999	85260	Jyothi	\N
25	400	6028216532	85083	Lakshman	\N
26	430	4803339999	85260	Anita	\N
27	435	6024593225	85083	Divya	\N
28	443	6025955044	85083	Lax	\N
29	446	6025955044	85083	lax	\N
30	461	4808610956	85083	ArunaP	\N
31	478	4808610933	85024	Priya	\N
32	488	4803339999	85024	Shiva	\N
33	532	6023339933	85024	UmaMaheshwara	\N
35	615	6028216532	85083	Lucky	\N
34	565	6024593333	85024	DivyaSri Venkata	\N
36	623	6023339999	85083	Niyathi Shah	\N
37	636	6023339999	85024	Vasu	\N
38	637	6023339999	85024	Vasu Katta	\N
39	639	5053339999	75038	kuni	\N
40	641	6023339999	85260	Lavanya	\N
18	207	4803339935	85260	Aruna Rallapalli	\N
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.messages (id, sender_id, receiver_id, message_text, is_read, created_at) FROM stdin;
1	1	2	Hello from curl!	f	2025-09-04 18:10:43.798546
2	207	175	Hi Ganesha	t	2025-09-08 19:58:28.350178
55	641	578	Hi Divyalu	f	2025-10-03 08:55:22.931844
4	207	175	Hi	t	2025-09-08 21:14:54.029278
3	207	175	Hi Ganesha, please bless us	t	2025-09-08 20:48:37.130838
5	175	207	Hi Aruna	t	2025-09-10 11:40:28.177256
6	175	207	I will	t	2025-09-10 11:40:45.35651
7	175	207	Hi Aruna, how are you	t	2025-09-10 12:58:30.076059
8	175	207	Hi, good to hear back from you!	t	2025-09-10 13:20:54.352428
12	294	298	Hi Venkateshwara	f	2025-09-10 17:34:07.089358
9	207	175	Thank you Ganesha, good to hear back from you as well	t	2025-09-10 14:35:40.013926
11	175	207	Hi Venkateshwara	t	2025-09-10 17:33:07.208052
10	207	290	Hi, Lakshmi	t	2025-09-10 17:14:22.920524
17	207	290	Please bless us	t	2025-09-11 11:48:19.478089
21	175	207	Hi Aruna on 09/14/2025	t	2025-09-14 15:29:17.729403
25	207	298	Hi Venkatesha, how are you?	t	2025-09-14 20:46:51.846242
26	298	207	Good Aruna, nice to hear back from you!	t	2025-09-14 20:50:30.465128
13	295	290	Hi Lakshmi	t	2025-09-10 21:24:32.668113
14	295	290	Please bless us	t	2025-09-10 21:24:58.952523
15	295	290	Hi Leela	t	2025-09-11 10:03:44.750448
16	295	290	Hi ji	t	2025-09-11 11:43:59.868952
23	295	290	Hi there 	t	2025-09-14 17:23:55.893386
18	294	290	Hi, ths is Kavita	t	2025-09-11 15:23:23.519761
27	290	294	Hi	f	2025-09-14 21:14:27.34696
19	290	207	Hi from Lakshmi	t	2025-09-14 15:08:36.117653
20	290	207	Hope you are doing good	t	2025-09-14 15:09:30.73441
22	290	207	I am good Aruna	t	2025-09-14 16:09:44.895575
24	290	207	Hi, from Aruna on 09/14/2025 night	t	2025-09-14 20:43:54.399356
28	207	290	Hi on 09/16/2025	t	2025-09-16 14:00:33.245467
29	435	432	Hello	t	2025-09-16 16:38:19.383836
30	432	435	Hi DivyaSri	t	2025-09-16 17:01:46.755516
31	446	175	Hi Ganesha!!	t	2025-09-16 20:17:31.232026
32	446	175	How are you baby?	t	2025-09-16 20:17:41.083019
33	175	446	I am good Honey!!	t	2025-09-16 20:18:44.648453
34	207	298	Hi	f	2025-09-17 09:19:12.837509
35	207	298	Bless us and guide us please	f	2025-09-17 15:13:27.245791
36	488	175	Hi Ganesha	t	2025-09-17 15:31:59.408077
37	175	488	Hi Shivji	t	2025-09-17 15:33:02.713164
38	175	488	Hi	f	2025-09-18 09:38:09.603753
39	175	488	Hi Ganesha, this is Shiva	f	2025-09-18 12:10:47.468836
43	565	175	Hi Ganesha	f	2025-09-26 17:33:06.492234
44	175	488	Hi Shivji	f	2025-09-28 10:04:39.99267
47	207	298	Hi my lord, my faith, my trust and my world	f	2025-09-28 12:53:35.28599
48	175	446	hi	f	2025-09-28 14:50:17.189855
40	532	175	Hi Aruna	t	2025-09-19 09:33:45.363678
49	175	532	Hi	f	2025-09-30 15:06:46.0133
50	175	488	Hi	f	2025-09-30 15:07:54.460984
51	175	532	Hi ganesha	f	2025-09-30 17:26:27.169729
53	565	432	hi	f	2025-10-01 19:30:25.088175
57	207	305	Hi Venkatesha 10-2025	f	2025-10-04 13:32:53.70973
59	175	641	Hi Lavanya	t	2025-10-04 13:35:55.909571
56	207	641	Hi, Lavanya - I need hands spa	t	2025-10-03 17:55:46.441772
58	207	641	Hi on 10-05-2025	t	2025-10-04 13:33:38.328491
60	641	207	Hi Aruna	t	2025-10-05 10:51:55.125301
61	207	641	😀	f	2025-10-05 21:03:07.76741
62	207	305	Hi I need math tutoring	f	2025-10-05 21:03:54.604038
45	207	175	Hi Ganesha on 09/28/2025	t	2025-09-28 11:19:18.922331
52	207	175	Hi, thank you for everything	t	2025-09-30 17:37:46.654017
65	175	305	Hi Venky	f	2025-10-05 21:26:18.572616
66	175	532	hi	f	2025-10-08 09:52:10.953872
75	175	207	Hi Aruna, 10-12-2025	f	2025-10-12 14:25:13.721078
68	175	305	hi	f	2025-10-09 11:13:16.611429
69	175	532	hi	f	2025-10-09 11:13:25.4248
71	175	668	Hi, I need decorations to be done	t	2025-10-09 20:34:16.250232
72	668	175	sure	t	2025-10-09 20:36:34.925724
41	207	290	Hi	t	2025-09-19 15:06:50.362959
42	207	290	Hi from Aruna on 09/21/2025	t	2025-09-21 18:39:38.834076
46	207	290	Hi on 09/28/2025	t	2025-09-28 11:38:13.353051
54	565	290	Hi Lakshmi	t	2025-10-02 14:28:04.36533
74	290	565	hi	f	2025-10-10 09:48:17.996736
73	290	207	Hi from lakshmi	t	2025-10-10 09:34:31.047227
64	175	207	Hi Aruna	t	2025-10-05 21:25:17.888578
76	694	668	Hi I need decorations for deepavali, are you available?	t	2025-10-12 17:14:22.729102
78	668	290	Hi can you take my picture	t	2025-10-12 19:11:11.511455
81	290	295	hi	f	2025-10-12 21:54:58.46172
82	290	175	Hi Ganesha - this is Lakshmi on 10-13-2025	t	2025-10-13 15:41:20.339915
83	175	290	Hi lakshmi	f	2025-10-13 15:51:23.039005
84	175	305	Hi	f	2025-10-13 17:29:14.438309
85	175	290	hi	f	2025-10-14 08:41:19.732649
86	290	207	hi	f	2025-10-22 11:51:22.026225
89	175	290	hi	f	2025-10-22 13:41:12.202177
88	175	668	hi	t	2025-10-22 13:19:18.003302
87	175	668	Hi	t	2025-10-22 12:45:05.313337
90	175	668	hi	t	2025-10-22 13:43:50.141189
79	290	668	Hi	t	2025-10-12 21:49:34.412058
80	290	668	No love	t	2025-10-12 21:50:27.942346
94	696	668	Hi Need decorations, can you respond	t	2025-10-22 14:34:50.725788
95	668	696	Hi call me @ 62055533333	t	2025-10-22 14:36:19.575915
96	696	668	Hi, sure	t	2025-10-22 14:37:33.624873
97	668	696	Let's meet at blue park Lalitha	t	2025-10-22 14:40:11.927269
98	696	668	Ok Priyanka	t	2025-10-22 15:25:21.526971
99	668	696	Let me know the date and time	t	2025-10-22 15:27:17.391456
100	696	668	Let's meet on 24th November Lalitha	f	2025-10-22 15:32:38.144201
92	668	290	hi	t	2025-10-22 13:47:29.902363
77	668	694	Sure, can you send me the details like date etc?	t	2025-10-12 17:28:21.568914
91	668	175	hi	t	2025-10-22 13:46:15.084749
101	175	668	Hi Liovable services	t	2025-10-22 15:40:25.157246
93	668	290	hi	t	2025-10-22 13:56:53.169136
102	698	231	Hi Sireesha, my kid needs tutoring, let me know when you are available to talk	t	2025-10-27 16:45:24.745235
103	231	698	Sure I am available tomorrow at 3:33pm	t	2025-10-27 16:47:05.06158
104	231	698	Are you available?	t	2025-10-27 16:47:33.889997
\.


--
-- Data for Name: password_resets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.password_resets (id, user_id, reset_token, expires_at, used) FROM stdin;
\.


--
-- Data for Name: service_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.service_categories (category_id, category_name, description, is_active, display_order, created_at) FROM stdin;
75	Fence Installation	Fence building and repair services	t	33	2025-10-23 10:05:17.400129
88	Financial Planning	Financial advice and investment planning	t	34	2025-10-23 10:05:17.400129
68	Flooring	Floor installation, repair, and refinishing	t	35	2025-10-23 10:05:17.400129
69	Garage Door	Garage door installation and repair	t	37	2025-10-23 10:05:17.400129
74	Gutter Cleaning	Gutter cleaning and maintenance services	t	39	2025-10-23 10:05:17.400129
111	Hair Salon	Hair cutting, styling, and coloring	t	40	2025-10-23 10:05:17.400129
70	Handyman	General home repair and maintenance services	t	41	2025-10-23 10:05:17.400129
110	Home Healthcare	In-home medical and care services	t	42	2025-10-23 10:05:17.400129
58	HVAC	Heating, ventilation, and air conditioning services	t	44	2025-10-23 10:05:17.400129
87	Insurance	Insurance policies and consultation	t	45	2025-10-23 10:05:17.400129
92	IT Support	Technical support and IT services	t	46	2025-10-23 10:05:17.400129
73	Junk Removal	Junk hauling and disposal services	t	47	2025-10-23 10:05:17.400129
4	Landscaping	\N	t	48	2025-10-01 17:06:55.114056
83	Legal Services	Legal consultation and representation	t	51	2025-10-23 10:05:17.400129
72	Locksmith	Lock installation, repair, and emergency services	t	53	2025-10-23 10:05:17.400129
102	Massage Therapy	Therapeutic and relaxation massage	t	55	2025-10-23 10:05:17.400129
105	Mental Health	Counseling and therapy services	t	56	2025-10-23 10:05:17.400129
94	Mobile App Development	Mobile application development	t	57	2025-10-23 10:05:17.400129
7	Moving	\N	t	58	2025-10-01 17:06:55.114056
65	Moving & Storage	Moving, packing, and storage solutions	t	59	2025-10-23 10:05:17.400129
113	Nail Salon	Manicure, pedicure, and nail services	t	61	2025-10-23 10:05:17.400129
97	Network Setup	Network installation and configuration	t	62	2025-10-23 10:05:17.400129
90	Notary	Notary public services	t	63	2025-10-23 10:05:17.400129
103	Nutrition Counseling	Diet and nutrition consultation	t	64	2025-10-23 10:05:17.400129
79	Oil Change	Vehicle oil change services	t	65	2025-10-23 10:05:17.400129
61	Painting	Interior and exterior painting services	t	67	2025-10-23 10:05:17.400129
101	Personal Training	Fitness training and coaching	t	68	2025-10-23 10:05:17.400129
64	Pest Control	Pest extermination and prevention services	t	69	2025-10-23 10:05:17.400129
6	Pet Care	\N	t	71	2025-10-01 17:06:55.114056
99	Phone Repair	Smartphone and tablet repair	t	75	2025-10-23 10:05:17.400129
9	Photography	\N	t	76	2025-10-01 17:06:55.114056
106	Physical Therapy	Physical rehabilitation services	t	77	2025-10-23 10:05:17.400129
2	Plumbing	\N	t	78	2025-10-01 17:06:55.114056
71	Pool Service	Pool cleaning, maintenance, and repair	t	79	2025-10-23 10:05:17.400129
86	Real Estate	Real estate buying, selling, and property management	t	81	2025-10-23 10:05:17.400129
62	Roofing	Roof installation, repair, and maintenance	t	82	2025-10-23 10:05:17.400129
95	Software Development	Custom software development services	t	86	2025-10-23 10:05:17.400129
114	Spa Services	Spa treatments and relaxation	t	87	2025-10-23 10:05:17.400129
53	Tailoring	\N	t	88	2025-10-06 14:11:30.689869
12	Tech Support	\N	t	90	2025-10-01 17:06:55.114056
80	Tire Service	Tire sales, installation, and repair	t	92	2025-10-23 10:05:17.400129
78	Towing	Vehicle towing and roadside assistance	t	93	2025-10-23 10:05:17.400129
89	Translation	Translation and interpretation services	t	94	2025-10-23 10:05:17.400129
8	Tutoring	\N	t	95	2025-10-01 17:06:55.114056
109	Vision Care	Eye exams and vision services	t	99	2025-10-23 10:05:17.400129
93	Web Development	Website design and development	t	102	2025-10-23 10:05:17.400129
67	Window Cleaning	Window washing and maintenance services	t	104	2025-10-23 10:05:17.400129
104	Yoga Instruction	Yoga classes and private instruction	t	106	2025-10-23 10:05:17.400129
13	Other	\N	t	999	2025-10-01 17:06:55.114056
84	Accounting	Accounting, bookkeeping, and tax services	t	1	2025-10-23 10:05:17.400129
66	Appliance Repair	Repair and maintenance of home appliances	t	2	2025-10-23 10:05:17.400129
81	Auto Body	Vehicle body repair and painting	t	4	2025-10-23 10:05:17.400129
82	Auto Glass	Windshield and auto glass repair/replacement	t	5	2025-10-23 10:05:17.400129
76	Auto Repair	Vehicle maintenance and repair services	t	6	2025-10-23 10:05:17.400129
112	Barbershop	Men's hair cutting and grooming	t	9	2025-10-23 10:05:17.400129
11	Beauty Services	\N	t	10	2025-10-01 17:06:55.114056
77	Car Wash	Car washing and detailing services	t	11	2025-10-23 10:05:17.400129
63	Carpentry	Custom woodwork and carpentry services	t	12	2025-10-23 10:05:17.400129
10	Catering	\N	t	13	2025-10-01 17:06:55.114056
107	Chiropractic	Chiropractic care and adjustment	t	14	2025-10-23 10:05:17.400129
1	Cleaning	\N	t	15	2025-10-01 17:06:55.114056
100	Cloud Services	Cloud computing and storage solutions	t	16	2025-10-23 10:05:17.400129
91	Computer Repair	Computer and laptop repair services	t	17	2025-10-23 10:05:17.400129
85	Consulting	Business and management consulting	t	18	2025-10-23 10:05:17.400129
98	Cybersecurity	Security audits and protection services	t	20	2025-10-23 10:05:17.400129
96	Data Recovery	Data backup and recovery services	t	22	2025-10-23 10:05:17.400129
54	Decorations	\N	t	23	2025-10-06 14:11:47.437145
108	Dental Services	Dental care and treatment	t	25	2025-10-23 10:05:17.400129
3	Electrical	\N	t	30	2025-10-01 17:06:55.114056
5	Home Repair	\N	t	43	2025-10-01 17:06:55.114056
124	Art Classes	Art instruction and workshops	t	3	2025-10-23 10:05:17.400129
153	Babysitting	Childcare and babysitting services	t	7	2025-10-23 10:05:17.400129
134	Balloon Decoration	Balloon arrangements for events	t	8	2025-10-23 10:05:17.400129
126	Cooking Classes	Culinary instruction and workshops	t	19	2025-10-23 10:05:17.400129
123	Dance Lessons	Dance instruction and classes	t	21	2025-10-23 10:05:17.400129
142	Delivery	Package and food delivery services	t	24	2025-10-23 10:05:17.400129
131	DJ Services	DJ and music entertainment	t	26	2025-10-23 10:05:17.400129
138	Dog Walking	Dog walking and exercise services	t	27	2025-10-23 10:05:17.400129
125	Driving School	Driver education and training	t	28	2025-10-23 10:05:17.400129
154	Elder Care	Senior care and assistance services	t	29	2025-10-23 10:05:17.400129
132	Entertainment	Party and event entertainment	t	31	2025-10-23 10:05:17.400129
127	Event Planning	Event coordination and planning	t	32	2025-10-23 10:05:17.400129
133	Floral Design	Flower arrangement and decoration	t	36	2025-10-23 10:05:17.400129
148	Graphic Design	Graphic design and branding	t	38	2025-10-23 10:05:17.400129
121	Language Classes	Language learning and instruction	t	49	2025-10-23 10:05:17.400129
143	Laundry Service	Laundry and dry cleaning services	t	50	2025-10-23 10:05:17.400129
151	Life Coaching	Personal development and coaching	t	52	2025-10-23 10:05:17.400129
115	Makeup Artist	Professional makeup application	t	54	2025-10-23 10:05:17.400129
120	Music Lessons	Music instruction and lessons	t	60	2025-10-23 10:05:17.400129
152	Organizing	Professional organizing services	t	66	2025-10-23 10:05:17.400129
141	Pet Boarding	Pet boarding and kennel services	t	70	2025-10-23 10:05:17.400129
136	Pet Grooming	Pet bathing and grooming services	t	72	2025-10-23 10:05:17.400129
137	Pet Sitting	Pet care and sitting services	t	73	2025-10-23 10:05:17.400129
140	Pet Training	Pet obedience and behavior training	t	74	2025-10-23 10:05:17.400129
147	Printing	Printing and copying services	t	80	2025-10-23 10:05:17.400129
155	Security Services	Security guard and monitoring services	t	83	2025-10-23 10:05:17.400129
145	Shoe Repair	Shoe and leather repair services	t	84	2025-10-23 10:05:17.400129
116	Skin Care	Facial treatments and skin care	t	85	2025-10-23 10:05:17.400129
117	Tattoo & Piercing	Tattoo and body piercing services	t	89	2025-10-23 10:05:17.400129
122	Test Prep	Standardized test preparation	t	91	2025-10-23 10:05:17.400129
139	Veterinary	Animal medical care and treatment	t	96	2025-10-23 10:05:17.400129
130	Videography	Video recording and production	t	97	2025-10-23 10:05:17.400129
150	Virtual Assistant	Remote administrative support	t	98	2025-10-23 10:05:17.400129
146	Watch Repair	Watch and clock repair services	t	100	2025-10-23 10:05:17.400129
118	Waxing	Hair removal and waxing services	t	101	2025-10-23 10:05:17.400129
135	Wedding Planning	Wedding coordination and planning	t	103	2025-10-23 10:05:17.400129
149	Writing & Editing	Content writing and editing services	t	105	2025-10-23 10:05:17.400129
\.


--
-- Data for Name: service_posts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.service_posts (id, user_id, poster_type, post_type, title, description, service_category, price_range, zip_code, phone_number, contact_email, is_active, status, created_at, updated_at, category_id, city, state) FROM stdin;
33	175	business_owner	offer	Catering Services	Lunch, dinner food catering	Catering	\N	85083	4808610956	ganesha@gmail.com	t	active	2025-10-24 14:49:06.708418	2025-10-24 14:49:06.708418	\N	Phoenix	AZ
34	175	business_owner	offer	Snack catering services	Breakfast and evening snacks	Catering	\N	85024	4808613333	ganesha@gmail.com	t	active	2025-10-24 14:50:43.014309	2025-10-24 14:50:43.014309	\N	Phoenix	AZ
35	305	business_owner	offer	Vengamamba food services	Free breakfast, lunch and dinner services	Catering	\N	85260	\N	venkateshwara@gmail.com	t	active	2025-10-24 14:55:27.138063	2025-10-24 14:55:27.138063	\N	Scottsdale	AZ
36	305	business_owner	offer	Dress stitching services	Both alterations and dress stitching services	Tailoring	\N	85260	\N	venkateshwara@gmail.com	t	active	2025-10-24 14:59:55.172739	2025-10-24 14:59:55.172739	\N	Scottsdale	AZ
37	432	business_owner	offer	Alterations services	Alterations only	Tailoring	\N	85083	\N	kabita@gmail.com	t	active	2025-10-24 15:02:52.303449	2025-10-24 15:02:52.303449	\N	Phoenix	AZ
38	432	business_owner	offer	Beautician services	Facial and eyebrows	Beauty Services	\N	85083	\N	kabita@gmail.com	t	active	2025-10-24 15:03:40.047022	2025-10-24 15:03:40.047022	\N	Phoenix	AZ
39	637	business_owner	offer	Cleaning services	Neat and clean	Cleaning	\N	85024	6023339999	vasu@hotmail.com	t	active	2025-10-24 15:06:36.106317	2025-10-24 15:06:36.106317	\N	Phoenix	AZ
40	637	business_owner	offer	Decors	Decoration	Decorations	\N	85024	6023339999	vasu@hotmail.com	t	active	2025-10-24 15:10:40.208082	2025-10-24 15:10:40.208082	\N	Phoenix	AZ
41	639	business_owner	offer	Plumbing services	Plumbing	Plumbing	\N	85083	5053339999	kuni@hotmail.com	t	active	2025-10-24 15:15:13.175326	2025-10-24 15:28:17.038698	\N	Phoenix	AZ
42	639	business_owner	offer	Decorations	decor	Decorations	\N	85260	5053339999	kuni@hotmail.com	t	active	2025-10-24 15:15:55.936015	2025-10-24 15:28:17.038698	\N	Scottsdale 	AZ
43	639	business_owner	offer	Cleaning Services	Clean and neat	Cleaning	\N	85083	5053339999	kuni@hotmail.com	t	active	2025-10-24 15:17:44.513164	2025-10-24 15:40:33.88914	\N	Phoenix	AZ
44	231	business_owner	offer	Tech Services	Tech support	Tech Support	\N	85083	4808610956	ap@yahoo.com	t	active	2025-10-27 16:33:22.641842	2025-10-27 16:33:22.641842	\N	Phoenix	AZ
47	231	business_owner	request	Decoration light installation	Installing lights for diwalli	Other	\N	85083	4808610956	ap@yahoo.com	t	active	2025-10-27 16:37:30.621575	2025-10-27 16:37:30.621575	\N	Phoenix	AZ
46	231	business_owner	offer	Baby care	Taking care of babies	Babysitting	\N	85083	4808610956	ap@yahoo.com	t	closed	2025-10-27 16:36:19.959707	2025-10-27 22:44:07.339111	\N	Phoenix	AZ
45	231	business_owner	offer	Tutoring	Teaching CS and maths	Tutoring	\N	85024	4808610956	ap@yahoo.com	t	active	2025-10-27 16:35:37.823407	2025-10-27 22:44:58.190736	\N	Phoenix	AZ
\.


--
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.services (service_id, business_id, service_name, price, description, category_id) FROM stdin;
\.


--
-- Data for Name: user_devices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_devices (id, user_id, device_token, created_at) FROM stdin;
\.


--
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_sessions (session_id, user_id, ip_address, device_info, created_at, expires_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (user_id, user_type, created_at, password, email, updated_at, full_name) FROM stdin;
181	customer	2025-09-03 16:50:17.155125	\N	\N	2025-09-03 16:50:17.155125	\N
183	business_owner	2025-09-04 10:28:34.78665	\N	\N	2025-09-04 10:28:34.78665	\N
186	customer	2025-09-04 15:09:45.744786	\N	\N	2025-09-04 15:09:45.744786	\N
187	customer	2025-09-04 15:35:28.13406	\N	\N	2025-09-04 15:35:28.13406	\N
189	customer	2025-09-04 17:01:48.056204	\N	\N	2025-09-04 17:01:48.056204	\N
191	customer	2025-09-04 17:53:02.72213	\N	\N	2025-09-04 17:53:02.72213	\N
193	customer	2025-09-04 18:18:53.917587	\N	\N	2025-09-04 18:18:53.917587	\N
194	customer	2025-09-04 19:58:00.832528	\N	\N	2025-09-04 19:58:00.832528	\N
196	customer	2025-09-05 11:04:05.221126	\N	\N	2025-09-05 11:04:05.221126	\N
198	customer	2025-09-05 15:46:21.493172	\N	\N	2025-09-05 15:46:21.493172	\N
200	customer	2025-09-05 16:28:59.796231	\N	\N	2025-09-05 16:28:59.796231	\N
202	customer	2025-09-05 17:33:31.380538	\N	\N	2025-09-05 17:33:31.380538	\N
203	customer	2025-09-05 17:33:31.683372	\N	\N	2025-09-05 17:33:31.683372	\N
204	customer	2025-09-05 17:33:34.004522	\N	\N	2025-09-05 17:33:34.004522	\N
206	customer	2025-09-05 18:04:24.721914	\N	\N	2025-09-05 18:04:24.721914	\N
208	customer	2025-09-07 11:31:48.383207	\N	\N	2025-09-07 11:31:48.383207	\N
210	customer	2025-09-07 11:34:44.291887	$2a$10$d/UOuCZMTvPN6RUImHPzZunxqbIAnU2f4B20qZ3iOnmv6Bcw9ysg.	d@gmail.com	2025-09-07 11:34:44.291887	\N
212	customer	2025-09-07 11:50:36.831274	$2a$10$.nORI8bEFrujpOK5k3N11.bq78/l8AOykMCOXlrBR46lkbAQESDmi	R@email.com	2025-09-07 11:50:36.831274	\N
214	business_owner	2025-09-07 12:51:15.711367	\N	\N	2025-09-07 12:51:15.711367	\N
216	business_owner	2025-09-07 13:49:01.453706	\N	\N	2025-09-07 13:49:01.453706	\N
218	business_owner	2025-09-07 15:49:59.185148	\N	\N	2025-09-07 15:49:59.185148	\N
220	business_owner	2025-09-07 16:07:47.539285	\N	\N	2025-09-07 16:07:47.539285	\N
222	business_owner	2025-09-07 16:45:44.766081	\N	\N	2025-09-07 16:45:44.766081	\N
224	business_owner	2025-09-07 20:45:44.568419	\N	\N	2025-09-07 20:45:44.568419	\N
226	business_owner	2025-09-07 20:54:46.525118	\N	\N	2025-09-07 20:54:46.525118	\N
228	business_owner	2025-09-07 21:43:43.186483	\N	\N	2025-09-07 21:43:43.186483	\N
230	customer	2025-09-08 09:34:42.206336	\N	\N	2025-09-08 09:34:42.206336	\N
232	customer	2025-09-08 10:42:10.328555	\N	\N	2025-09-08 10:42:10.328555	\N
234	customer	2025-09-08 11:24:59.264815	\N	\N	2025-09-08 11:24:59.264815	\N
236	customer	2025-09-08 14:36:14.783043	\N	\N	2025-09-08 14:36:14.783043	\N
238	customer	2025-09-08 15:36:51.363034	\N	\N	2025-09-08 15:36:51.363034	\N
240	customer	2025-09-08 15:58:09.960574	\N	\N	2025-09-08 15:58:09.960574	\N
242	customer	2025-09-08 16:49:12.634598	\N	\N	2025-09-08 16:49:12.634598	\N
244	customer	2025-09-08 19:57:39.49917	\N	\N	2025-09-08 19:57:39.49917	\N
246	customer	2025-09-08 21:10:34.649396	\N	\N	2025-09-08 21:10:34.649396	\N
248	business_owner	2025-09-08 22:18:15.261329	\N	\N	2025-09-08 22:18:15.261329	\N
250	business_owner	2025-09-09 14:48:51.972478	\N	\N	2025-09-09 14:48:51.972478	\N
252	business_owner	2025-09-09 14:59:14.719928	\N	\N	2025-09-09 14:59:14.719928	\N
254	business_owner	2025-09-09 15:16:49.848658	\N	\N	2025-09-09 15:16:49.848658	\N
256	business_owner	2025-09-09 16:19:35.521345	\N	\N	2025-09-09 16:19:35.521345	\N
258	business_owner	2025-09-09 17:39:08.499154	\N	\N	2025-09-09 17:39:08.499154	\N
260	business_owner	2025-09-09 18:04:40.601248	\N	\N	2025-09-09 18:04:40.601248	\N
262	business_owner	2025-09-09 18:17:37.215339	\N	\N	2025-09-09 18:17:37.215339	\N
264	business_owner	2025-09-09 23:16:15.771098	\N	\N	2025-09-09 23:16:15.771098	\N
266	business_owner	2025-09-10 08:56:28.900305	\N	\N	2025-09-10 08:56:28.900305	\N
268	business_owner	2025-09-10 10:01:06.517492	\N	\N	2025-09-10 10:01:06.517492	\N
270	business_owner	2025-09-10 10:55:31.347919	\N	\N	2025-09-10 10:55:31.347919	\N
272	business_owner	2025-09-10 11:39:35.217052	\N	\N	2025-09-10 11:39:35.217052	\N
274	business_owner	2025-09-10 12:12:36.597902	\N	\N	2025-09-10 12:12:36.597902	\N
276	business_owner	2025-09-10 12:53:50.56978	\N	\N	2025-09-10 12:53:50.56978	\N
278	business_owner	2025-09-10 13:19:58.135595	\N	\N	2025-09-10 13:19:58.135595	\N
280	customer	2025-09-10 14:04:46.987175	\N	\N	2025-09-10 14:04:46.987175	\N
282	customer	2025-09-10 14:50:03.936297	\N	\N	2025-09-10 14:50:03.936297	\N
284	customer	2025-09-10 15:38:58.33986	\N	\N	2025-09-10 15:38:58.33986	\N
286	customer	2025-09-10 17:02:36.65734	\N	\N	2025-09-10 17:02:36.65734	\N
288	customer	2025-09-10 17:04:03.046101	\N	\N	2025-09-10 17:04:03.046101	\N
292	customer	2025-09-10 17:14:33.078118	\N	\N	2025-09-10 17:14:33.078118	\N
294	customer	2025-09-10 17:25:39.88611	$2a$10$AsaI1fmflnpWgYlu8vQQXON34w.hz2C.Q8f63NDPkRfeI3K54cOp6	k@hotmail.com	2025-09-10 17:25:39.88611	\N
296	customer	2025-09-10 17:27:15.75596	$2a$10$/QIX4WDILswnSCfzGTzj2us6JHrLlBQl5SmiEoJOWXG/kxEE/vD8O	j@hotmail.com	2025-09-10 17:27:15.75596	\N
298	business_owner	2025-09-10 17:32:22.006982	$2b$10$7.C/DZun9RIXKa/Sj7D.9uyCgCFCstLoBbh7IYppKyOFJ7hTv2ww.	v@gmail.com	2025-09-10 17:32:22.006982	\N
300	business_owner	2025-09-10 17:34:10.273437	\N	\N	2025-09-10 17:34:10.273437	\N
302	business_owner	2025-09-10 17:54:02.033931	\N	\N	2025-09-10 17:54:02.033931	\N
304	business_owner	2025-09-10 21:16:48.932634	\N	\N	2025-09-10 21:16:48.932634	\N
306	customer	2025-09-10 21:22:33.919799	\N	\N	2025-09-10 21:22:33.919799	\N
308	customer	2025-09-10 21:27:25.229512	\N	\N	2025-09-10 21:27:25.229512	\N
310	customer	2025-09-10 21:55:51.002605	\N	\N	2025-09-10 21:55:51.002605	\N
312	customer	2025-09-11 09:30:27.514507	\N	\N	2025-09-11 09:30:27.514507	\N
314	customer	2025-09-11 09:49:58.194384	\N	\N	2025-09-11 09:49:58.194384	\N
316	business_owner	2025-09-11 10:04:15.235752	\N	\N	2025-09-11 10:04:15.235752	\N
318	business_owner	2025-09-11 11:07:34.507234	\N	\N	2025-09-11 11:07:34.507234	\N
320	customer	2025-09-11 11:42:14.665471	\N	\N	2025-09-11 11:42:14.665471	\N
322	business_owner	2025-09-11 11:50:09.398067	\N	\N	2025-09-11 11:50:09.398067	\N
324	business_owner	2025-09-11 12:05:21.677397	\N	\N	2025-09-11 12:05:21.677397	\N
326	business_owner	2025-09-11 12:55:14.400464	\N	\N	2025-09-11 12:55:14.400464	\N
328	business_owner	2025-09-11 13:13:19.630021	\N	\N	2025-09-11 13:13:19.630021	\N
330	business_owner	2025-09-11 13:48:01.125754	\N	\N	2025-09-11 13:48:01.125754	\N
332	business_owner	2025-09-11 15:14:00.306101	\N	\N	2025-09-11 15:14:00.306101	\N
334	customer	2025-09-11 15:20:29.196304	\N	\N	2025-09-11 15:20:29.196304	\N
336	business_owner	2025-09-11 15:23:29.351452	\N	\N	2025-09-11 15:23:29.351452	\N
338	business_owner	2025-09-11 16:13:39.429495	\N	\N	2025-09-11 16:13:39.429495	\N
340	business_owner	2025-09-11 17:03:47.960656	\N	\N	2025-09-11 17:03:47.960656	\N
342	business_owner	2025-09-11 17:32:49.801073	\N	\N	2025-09-11 17:32:49.801073	\N
344	business_owner	2025-09-11 21:51:07.292933	\N	\N	2025-09-11 21:51:07.292933	\N
345	customer	2025-09-12 07:44:20.820455	\N	\N	2025-09-12 07:44:20.820455	\N
347	business_owner	2025-09-12 08:10:33.942441	\N	\N	2025-09-12 08:10:33.942441	\N
349	business_owner	2025-09-12 09:15:27.115784	\N	\N	2025-09-12 09:15:27.115784	\N
351	business_owner	2025-09-12 10:02:20.265985	\N	\N	2025-09-12 10:02:20.265985	\N
353	business_owner	2025-09-12 10:27:39.172092	\N	\N	2025-09-12 10:27:39.172092	\N
355	business_owner	2025-09-12 18:51:10.570684	\N	\N	2025-09-12 18:51:10.570684	\N
359	business_owner	2025-09-14 12:07:36.054494	\N	\N	2025-09-14 12:07:36.054494	\N
361	business_owner	2025-09-14 12:42:16.58518	\N	\N	2025-09-14 12:42:16.58518	\N
363	business_owner	2025-09-14 13:20:18.107467	\N	\N	2025-09-14 13:20:18.107467	\N
365	business_owner	2025-09-14 15:07:23.034126	\N	\N	2025-09-14 15:07:23.034126	\N
367	business_owner	2025-09-14 16:07:57.144817	\N	\N	2025-09-14 16:07:57.144817	\N
369	business_owner	2025-09-14 16:48:08.639159	\N	\N	2025-09-14 16:48:08.639159	\N
371	customer	2025-09-14 17:16:47.550737	\N	\N	2025-09-14 17:16:47.550737	\N
373	customer	2025-09-14 17:17:39.211858	\N	\N	2025-09-14 17:17:39.211858	\N
375	customer	2025-09-14 17:20:46.823808	\N	\N	2025-09-14 17:20:46.823808	\N
377	business_owner	2025-09-14 20:41:31.162166	\N	\N	2025-09-14 20:41:31.162166	\N
378	business_owner	2025-09-14 20:42:43.263445	\N	\N	2025-09-14 20:42:43.263445	\N
182	customer	2025-09-04 10:24:56.157326	\N	\N	2025-09-04 10:24:56.157326	\N
184	customer	2025-09-04 10:53:52.501563	\N	\N	2025-09-04 10:53:52.501563	\N
185	customer	2025-09-04 15:09:45.743668	\N	\N	2025-09-04 15:09:45.743668	\N
188	customer	2025-09-04 15:46:52.343845	\N	\N	2025-09-04 15:46:52.343845	\N
190	customer	2025-09-04 17:14:32.58197	\N	\N	2025-09-04 17:14:32.58197	\N
192	customer	2025-09-04 18:04:26.647951	\N	\N	2025-09-04 18:04:26.647951	\N
195	customer	2025-09-04 20:00:46.470437	\N	\N	2025-09-04 20:00:46.470437	\N
197	customer	2025-09-05 11:20:34.614069	\N	\N	2025-09-05 11:20:34.614069	\N
199	customer	2025-09-05 15:51:13.186314	\N	\N	2025-09-05 15:51:13.186314	\N
201	customer	2025-09-05 17:02:13.357765	\N	\N	2025-09-05 17:02:13.357765	\N
205	customer	2025-09-05 17:56:14.913137	$2a$10$EfpwnpcJWtacjaoDKRpyge7QxRsFYMakGcy6nSjlBbvv8si494ys2	johndoe@example.com	2025-09-05 17:56:14.913137	\N
209	customer	2025-09-07 11:34:05.202922	\N	\N	2025-09-07 11:34:05.202922	\N
211	customer	2025-09-07 11:49:59.789051	\N	\N	2025-09-07 11:49:59.789051	\N
213	customer	2025-09-07 12:48:48.980681	\N	\N	2025-09-07 12:48:48.980681	\N
215	business_owner	2025-09-07 13:02:49.653025	\N	\N	2025-09-07 13:02:49.653025	\N
217	business_owner	2025-09-07 13:56:50.428193	\N	\N	2025-09-07 13:56:50.428193	\N
219	business_owner	2025-09-07 15:58:31.837533	\N	\N	2025-09-07 15:58:31.837533	\N
221	business_owner	2025-09-07 16:37:04.309698	\N	\N	2025-09-07 16:37:04.309698	\N
223	business_owner	2025-09-07 20:17:46.035687	\N	\N	2025-09-07 20:17:46.035687	\N
225	business_owner	2025-09-07 20:53:59.327825	\N	\N	2025-09-07 20:53:59.327825	\N
227	business_owner	2025-09-07 21:07:34.769062	\N	\N	2025-09-07 21:07:34.769062	\N
229	business_owner	2025-09-08 09:10:46.125574	\N	\N	2025-09-08 09:10:46.125574	\N
231	customer	2025-09-08 09:35:30.37852	$2a$10$fb/8oNCeAVDPAGX.1LfN..XAix3vhrWB02v9rR6/LKiBaHyl2BI1W	ap@yahoo.com	2025-09-08 09:35:30.37852	\N
233	customer	2025-09-08 10:48:11.09208	\N	\N	2025-09-08 10:48:11.09208	\N
235	customer	2025-09-08 11:57:58.70518	\N	\N	2025-09-08 11:57:58.70518	\N
237	customer	2025-09-08 15:08:05.159755	\N	\N	2025-09-08 15:08:05.159755	\N
239	customer	2025-09-08 15:44:44.14099	\N	\N	2025-09-08 15:44:44.14099	\N
241	customer	2025-09-08 16:07:38.954383	\N	\N	2025-09-08 16:07:38.954383	\N
243	customer	2025-09-08 17:01:16.238382	\N	\N	2025-09-08 17:01:16.238382	\N
245	customer	2025-09-08 20:47:01.588183	\N	\N	2025-09-08 20:47:01.588183	\N
247	business_owner	2025-09-08 21:16:21.070839	\N	\N	2025-09-08 21:16:21.070839	\N
249	business_owner	2025-09-09 14:28:58.001215	\N	\N	2025-09-09 14:28:58.001215	\N
251	business_owner	2025-09-09 14:51:07.991742	\N	\N	2025-09-09 14:51:07.991742	\N
253	business_owner	2025-09-09 15:08:19.44429	\N	\N	2025-09-09 15:08:19.44429	\N
255	business_owner	2025-09-09 15:28:54.836097	\N	\N	2025-09-09 15:28:54.836097	\N
257	business_owner	2025-09-09 16:28:12.46336	\N	\N	2025-09-09 16:28:12.46336	\N
259	business_owner	2025-09-09 17:58:45.81736	\N	\N	2025-09-09 17:58:45.81736	\N
261	business_owner	2025-09-09 18:06:28.322154	\N	\N	2025-09-09 18:06:28.322154	\N
263	business_owner	2025-09-09 23:02:18.800761	\N	\N	2025-09-09 23:02:18.800761	\N
265	business_owner	2025-09-09 23:27:33.084087	\N	\N	2025-09-09 23:27:33.084087	\N
267	business_owner	2025-09-10 09:52:28.925359	\N	\N	2025-09-10 09:52:28.925359	\N
269	business_owner	2025-09-10 10:27:35.480515	\N	\N	2025-09-10 10:27:35.480515	\N
271	business_owner	2025-09-10 11:24:59.481933	\N	\N	2025-09-10 11:24:59.481933	\N
273	business_owner	2025-09-10 11:58:22.969943	\N	\N	2025-09-10 11:58:22.969943	\N
275	business_owner	2025-09-10 12:15:06.62627	\N	\N	2025-09-10 12:15:06.62627	\N
277	business_owner	2025-09-10 12:57:16.906023	\N	\N	2025-09-10 12:57:16.906023	\N
279	customer	2025-09-10 13:20:59.113157	\N	\N	2025-09-10 13:20:59.113157	\N
281	customer	2025-09-10 14:33:48.360875	\N	\N	2025-09-10 14:33:48.360875	\N
283	customer	2025-09-10 15:20:43.724836	\N	\N	2025-09-10 15:20:43.724836	\N
285	customer	2025-09-10 16:08:54.089978	\N	\N	2025-09-10 16:08:54.089978	\N
287	business_owner	2025-09-10 17:03:24.158184	\N	\N	2025-09-10 17:03:24.158184	\N
289	business_owner	2025-09-10 17:10:16.151682	\N	\N	2025-09-10 17:10:16.151682	\N
291	customer	2025-09-10 17:13:31.283755	\N	\N	2025-09-10 17:13:31.283755	\N
293	customer	2025-09-10 17:21:52.761435	\N	\N	2025-09-10 17:21:52.761435	\N
295	customer	2025-09-10 17:26:22.352962	$2a$10$aYUaxy1IKckg3r7pkqOUJuLkKKaRqdNcANqjagyxL1d1N0C9LohQa	l@hotmail.com	2025-09-10 17:26:22.352962	\N
297	business_owner	2025-09-10 17:30:43.452687	\N	\N	2025-09-10 17:30:43.452687	\N
299	customer	2025-09-10 17:33:18.018987	\N	\N	2025-09-10 17:33:18.018987	\N
301	business_owner	2025-09-10 17:53:23.56146	\N	\N	2025-09-10 17:53:23.56146	\N
303	customer	2025-09-10 21:15:40.972367	\N	\N	2025-09-10 21:15:40.972367	\N
305	business_owner	2025-09-10 21:19:02.56029	$2b$10$qBy8Twc8yV/Gf4bQ3KjYzOHuqJ2SuxrQRR3uYEPhHw2kE2axPd06q	venkateshwara@gmail.com	2025-09-10 21:19:02.56029	\N
307	business_owner	2025-09-10 21:25:17.410333	\N	\N	2025-09-10 21:25:17.410333	\N
309	customer	2025-09-10 21:52:05.204388	\N	\N	2025-09-10 21:52:05.204388	\N
172	business_owner	2025-09-03 13:25:33.513799	$2b$10$vJqgRtqCS9TqQ99nLrmX5.6mUvftMx.I82hLO4ZI06YI/lgHjrhwO	testowner@example.com	2025-09-03 13:25:33.513799	\N
311	business_owner	2025-09-11 09:27:58.069905	\N	\N	2025-09-11 09:27:58.069905	\N
313	customer	2025-09-11 09:47:49.662897	\N	\N	2025-09-11 09:47:49.662897	\N
315	customer	2025-09-11 10:02:42.47061	\N	\N	2025-09-11 10:02:42.47061	\N
317	business_owner	2025-09-11 10:59:30.886053	\N	\N	2025-09-11 10:59:30.886053	\N
319	business_owner	2025-09-11 11:41:02.094903	\N	\N	2025-09-11 11:41:02.094903	\N
321	customer	2025-09-11 11:47:07.167651	\N	\N	2025-09-11 11:47:07.167651	\N
323	customer	2025-09-11 11:51:19.336357	\N	\N	2025-09-11 11:51:19.336357	\N
325	business_owner	2025-09-11 12:22:12.75773	\N	\N	2025-09-11 12:22:12.75773	\N
327	business_owner	2025-09-11 12:56:14.154617	\N	\N	2025-09-11 12:56:14.154617	\N
329	business_owner	2025-09-11 13:22:54.329543	\N	\N	2025-09-11 13:22:54.329543	\N
331	business_owner	2025-09-11 14:38:14.03388	\N	\N	2025-09-11 14:38:14.03388	\N
333	customer	2025-09-11 15:19:42.189198	\N	\N	2025-09-11 15:19:42.189198	\N
335	customer	2025-09-11 15:21:44.276438	\N	\N	2025-09-11 15:21:44.276438	\N
337	business_owner	2025-09-11 15:48:11.525523	\N	\N	2025-09-11 15:48:11.525523	\N
339	business_owner	2025-09-11 16:38:09.165367	\N	\N	2025-09-11 16:38:09.165367	\N
341	business_owner	2025-09-11 17:15:50.619724	\N	\N	2025-09-11 17:15:50.619724	\N
343	business_owner	2025-09-11 20:49:36.317317	\N	\N	2025-09-11 20:49:36.317317	\N
346	business_owner	2025-09-12 07:45:23.737334	\N	\N	2025-09-12 07:45:23.737334	\N
348	business_owner	2025-09-12 08:33:29.987498	\N	\N	2025-09-12 08:33:29.987498	\N
350	business_owner	2025-09-12 09:41:00.816979	\N	\N	2025-09-12 09:41:00.816979	\N
352	business_owner	2025-09-12 10:14:46.382432	\N	\N	2025-09-12 10:14:46.382432	\N
354	business_owner	2025-09-12 10:28:01.257928	\N	\N	2025-09-12 10:28:01.257928	\N
356	business_owner	2025-09-14 09:47:35.70329	\N	\N	2025-09-14 09:47:35.70329	\N
357	business_owner	2025-09-14 09:47:36.162062	\N	\N	2025-09-14 09:47:36.162062	\N
358	business_owner	2025-09-14 09:47:38.42404	\N	\N	2025-09-14 09:47:38.42404	\N
360	business_owner	2025-09-14 12:24:20.631434	\N	\N	2025-09-14 12:24:20.631434	\N
362	business_owner	2025-09-14 13:03:40.661942	\N	\N	2025-09-14 13:03:40.661942	\N
364	business_owner	2025-09-14 14:38:30.82112	\N	\N	2025-09-14 14:38:30.82112	\N
366	business_owner	2025-09-14 15:28:05.16948	\N	\N	2025-09-14 15:28:05.16948	\N
368	business_owner	2025-09-14 16:19:45.452382	\N	\N	2025-09-14 16:19:45.452382	\N
370	business_owner	2025-09-14 17:03:18.725185	\N	\N	2025-09-14 17:03:18.725185	\N
372	customer	2025-09-14 17:17:03.575278	\N	\N	2025-09-14 17:17:03.575278	\N
374	customer	2025-09-14 17:20:09.052925	\N	\N	2025-09-14 17:20:09.052925	\N
376	customer	2025-09-14 17:22:07.640433	\N	\N	2025-09-14 17:22:07.640433	\N
175	business_owner	2025-09-03 13:40:18.673066	$2b$10$lCfsnkThvpYRlgYMpMA7y.Vag.4h/UmvjiXdQj.B9GIhOoLIjMZ/y	ganesha@gmail.com	2025-10-03 10:11:06.53682	\N
379	customer	2025-09-14 20:44:08.868966	\N	\N	2025-09-14 20:44:08.868966	\N
380	business_owner	2025-09-14 20:46:58.647778	\N	\N	2025-09-14 20:46:58.647778	\N
381	customer	2025-09-14 20:50:44.559131	\N	\N	2025-09-14 20:50:44.559131	\N
382	business_owner	2025-09-14 20:52:59.371612	\N	\N	2025-09-14 20:52:59.371612	\N
383	business_owner	2025-09-14 20:54:00.669426	\N	\N	2025-09-14 20:54:00.669426	\N
384	business_owner	2025-09-14 21:00:50.907981	\N	\N	2025-09-14 21:00:50.907981	\N
385	business_owner	2025-09-14 21:01:31.011986	\N	\N	2025-09-14 21:01:31.011986	\N
386	business_owner	2025-09-14 21:02:08.901251	\N	\N	2025-09-14 21:02:08.901251	\N
387	business_owner	2025-09-14 21:09:30.183398	\N	\N	2025-09-14 21:09:30.183398	\N
388	business_owner	2025-09-14 21:10:27.305715	\N	\N	2025-09-14 21:10:27.305715	\N
389	business_owner	2025-09-14 21:13:43.476787	\N	\N	2025-09-14 21:13:43.476787	\N
390	customer	2025-09-14 21:14:37.324402	\N	\N	2025-09-14 21:14:37.324402	\N
391	customer	2025-09-14 21:15:26.32111	\N	\N	2025-09-14 21:15:26.32111	\N
392	business_owner	2025-09-14 21:18:08.969756	\N	\N	2025-09-14 21:18:08.969756	\N
393	customer	2025-09-15 09:17:02.06136	\N	\N	2025-09-15 09:17:02.06136	\N
394	customer	2025-09-15 09:19:43.592476	\N	\N	2025-09-15 09:19:43.592476	\N
395	customer	2025-09-15 09:45:06.967002	\N	\N	2025-09-15 09:45:06.967002	\N
396	customer	2025-09-15 09:50:16.50187	\N	\N	2025-09-15 09:50:16.50187	\N
397	customer	2025-09-15 11:22:28.09053	\N	\N	2025-09-15 11:22:28.09053	\N
398	customer	2025-09-15 11:42:41.129789	\N	\N	2025-09-15 11:42:41.129789	\N
399	customer	2025-09-15 12:00:46.726522	\N	\N	2025-09-15 12:00:46.726522	\N
400	customer	2025-09-15 12:02:06.335577	$2a$10$S6Cz7cOkLcFkeZHfQcs1B.KK9nuImBadQB43hVytk6pLH3Mhp5gy6	laksh@hotmail.com	2025-09-15 12:02:06.335577	\N
401	customer	2025-09-15 12:03:50.819017	\N	\N	2025-09-15 12:03:50.819017	\N
402	customer	2025-09-15 12:04:42.038852	\N	\N	2025-09-15 12:04:42.038852	\N
403	business_owner	2025-09-15 12:05:22.49051	\N	\N	2025-09-15 12:05:22.49051	\N
404	customer	2025-09-15 18:21:51.191214	\N	\N	2025-09-15 18:21:51.191214	\N
405	customer	2025-09-15 18:25:40.978433	\N	\N	2025-09-15 18:25:40.978433	\N
406	customer	2025-09-15 18:25:53.824996	\N	\N	2025-09-15 18:25:53.824996	\N
407	customer	2025-09-15 20:40:02.529058	\N	\N	2025-09-15 20:40:02.529058	\N
408	customer	2025-09-15 22:20:08.728586	\N	\N	2025-09-15 22:20:08.728586	\N
409	business_owner	2025-09-15 22:21:43.858884	\N	\N	2025-09-15 22:21:43.858884	\N
410	customer	2025-09-15 22:23:50.267218	\N	\N	2025-09-15 22:23:50.267218	\N
411	customer	2025-09-16 12:20:48.50613	\N	\N	2025-09-16 12:20:48.50613	\N
412	business_owner	2025-09-16 12:21:29.215608	\N	\N	2025-09-16 12:21:29.215608	\N
413	business_owner	2025-09-16 12:43:51.245491	\N	\N	2025-09-16 12:43:51.245491	\N
414	business_owner	2025-09-16 12:45:29.95347	\N	\N	2025-09-16 12:45:29.95347	\N
415	business_owner	2025-09-16 12:57:30.460047	\N	\N	2025-09-16 12:57:30.460047	\N
416	business_owner	2025-09-16 13:08:07.433545	\N	\N	2025-09-16 13:08:07.433545	\N
417	business_owner	2025-09-16 13:18:10.60306	\N	\N	2025-09-16 13:18:10.60306	\N
418	customer	2025-09-16 13:23:08.026348	\N	\N	2025-09-16 13:23:08.026348	\N
419	customer	2025-09-16 13:23:47.482004	\N	\N	2025-09-16 13:23:47.482004	\N
420	business_owner	2025-09-16 13:25:14.97558	\N	\N	2025-09-16 13:25:14.97558	\N
421	business_owner	2025-09-16 13:26:20.791135	$2b$10$0VAlpj72X17NC/86dhL80e8L6NDXlu1wQJTEzy2edFiW.lEp3V4Cq	p@gmail.com	2025-09-16 13:26:20.791135	\N
422	business_owner	2025-09-16 13:42:17.161569	\N	\N	2025-09-16 13:42:17.161569	\N
423	business_owner	2025-09-16 13:58:03.272572	\N	\N	2025-09-16 13:58:03.272572	\N
424	business_owner	2025-09-16 13:58:48.39062	\N	\N	2025-09-16 13:58:48.39062	\N
425	customer	2025-09-16 13:59:22.653544	\N	\N	2025-09-16 13:59:22.653544	\N
426	customer	2025-09-16 14:00:40.341554	\N	\N	2025-09-16 14:00:40.341554	\N
427	customer	2025-09-16 14:51:01.25654	\N	\N	2025-09-16 14:51:01.25654	\N
428	customer	2025-09-16 16:24:52.02499	\N	\N	2025-09-16 16:24:52.02499	\N
429	customer	2025-09-16 16:25:32.766755	\N	\N	2025-09-16 16:25:32.766755	\N
430	customer	2025-09-16 16:26:30.152998	$2a$10$pKYz7zUWxGhDn537HNPS6OkibnaIswDYplXg.UnX6GsgZTGcq9zau	anita@hotmail.com	2025-09-16 16:26:30.152998	\N
431	business_owner	2025-09-16 16:26:41.442577	\N	\N	2025-09-16 16:26:41.442577	\N
432	business_owner	2025-09-16 16:28:24.684816	$2b$10$Tx02g5dVatNQmX8S3Hma9eROSbVGjD9LcvzGkxJQetTrlVbCUtkxq	kabita@gmail.com	2025-09-16 16:28:24.684816	\N
433	customer	2025-09-16 16:29:15.405149	\N	\N	2025-09-16 16:29:15.405149	\N
434	customer	2025-09-16 16:37:13.674242	\N	\N	2025-09-16 16:37:13.674242	\N
435	customer	2025-09-16 16:38:00.243151	$2a$10$UmqqVv7msI1bSeu7PUami.VNdW1eaIScF/yK8xl24nPvfq.qKcYgu	itsdivya099@gmail.com	2025-09-16 16:38:00.243151	\N
436	business_owner	2025-09-16 16:38:33.180694	\N	\N	2025-09-16 16:38:33.180694	\N
437	customer	2025-09-16 16:41:19.755959	\N	\N	2025-09-16 16:41:19.755959	\N
438	business_owner	2025-09-16 16:42:33.704159	\N	\N	2025-09-16 16:42:33.704159	\N
439	customer	2025-09-16 17:01:52.21399	\N	\N	2025-09-16 17:01:52.21399	\N
440	customer	2025-09-16 17:10:43.602748	\N	\N	2025-09-16 17:10:43.602748	\N
441	business_owner	2025-09-16 17:11:30.728238	\N	\N	2025-09-16 17:11:30.728238	\N
442	customer	2025-09-16 20:04:07.547123	\N	\N	2025-09-16 20:04:07.547123	\N
443	customer	2025-09-16 20:04:51.407092	$2a$10$UGFiwy9yeUuPRs6lVz5tZen7WNYedBl/GonBlRmvnWmnY.jh/1aiK	Rallap	2025-09-16 20:04:51.407092	\N
444	customer	2025-09-16 20:15:12.612618	\N	\N	2025-09-16 20:15:12.612618	\N
445	customer	2025-09-16 20:15:43.064865	\N	\N	2025-09-16 20:15:43.064865	\N
446	customer	2025-09-16 20:16:16.221714	$2a$10$QWd3JUD/j.Qhqwuepul6mub0YvlE93Nn0YWL7DyL12kx47PnAMsSO	rallapalli	2025-09-16 20:16:16.221714	\N
447	customer	2025-09-16 20:16:39.317493	\N	\N	2025-09-16 20:16:39.317493	\N
448	business_owner	2025-09-16 20:17:47.266852	\N	\N	2025-09-16 20:17:47.266852	\N
449	customer	2025-09-16 20:18:50.482672	\N	\N	2025-09-16 20:18:50.482672	\N
450	customer	2025-09-16 20:19:28.081264	\N	\N	2025-09-16 20:19:28.081264	\N
451	business_owner	2025-09-16 20:19:54.498373	\N	\N	2025-09-16 20:19:54.498373	\N
452	business_owner	2025-09-16 20:22:15.083673	$2b$10$iYW7u8G/KSXdthmCAjqZz.rB46AVHH6m7dxWvuHTRNcNjW.kEMhNi	rallapalli@hotmail.com	2025-09-16 20:22:15.083673	\N
453	business_owner	2025-09-16 20:22:22.960898	\N	\N	2025-09-16 20:22:22.960898	\N
454	business_owner	2025-09-16 22:14:21.916592	\N	\N	2025-09-16 22:14:21.916592	\N
455	customer	2025-09-16 22:16:05.864312	\N	\N	2025-09-16 22:16:05.864312	\N
456	business_owner	2025-09-16 22:16:12.252569	\N	\N	2025-09-16 22:16:12.252569	\N
457	customer	2025-09-16 22:16:15.766595	\N	\N	2025-09-16 22:16:15.766595	\N
458	business_owner	2025-09-16 22:19:23.2586	\N	\N	2025-09-16 22:19:23.2586	\N
459	business_owner	2025-09-16 22:19:52.117703	\N	\N	2025-09-16 22:19:52.117703	\N
460	customer	2025-09-16 22:21:37.687331	\N	\N	2025-09-16 22:21:37.687331	\N
461	customer	2025-09-16 22:22:46.663601	$2a$10$E7/GAzV/rY7t9cGhZAsYiux.vZ3vcRv8Im5HxJMmzb3fzmPt.8LuO	ap@hotmail.com	2025-09-16 22:22:46.663601	\N
462	customer	2025-09-16 22:23:06.669642	\N	\N	2025-09-16 22:23:06.669642	\N
463	business_owner	2025-09-16 22:23:16.761905	\N	\N	2025-09-16 22:23:16.761905	\N
464	customer	2025-09-16 22:33:47.911969	\N	\N	2025-09-16 22:33:47.911969	\N
465	customer	2025-09-16 22:34:11.380108	\N	\N	2025-09-16 22:34:11.380108	\N
466	customer	2025-09-16 22:37:17.503411	\N	\N	2025-09-16 22:37:17.503411	\N
467	customer	2025-09-16 22:37:19.236645	\N	\N	2025-09-16 22:37:19.236645	\N
468	customer	2025-09-16 22:38:28.481117	\N	\N	2025-09-16 22:38:28.481117	\N
469	customer	2025-09-16 22:39:27.598278	\N	\N	2025-09-16 22:39:27.598278	\N
470	customer	2025-09-16 22:43:36.893537	\N	\N	2025-09-16 22:43:36.893537	\N
471	business_owner	2025-09-16 22:45:55.937101	\N	\N	2025-09-16 22:45:55.937101	\N
472	business_owner	2025-09-16 23:00:14.82099	\N	\N	2025-09-16 23:00:14.82099	\N
473	business_owner	2025-09-16 23:21:16.210277	\N	\N	2025-09-16 23:21:16.210277	\N
474	business_owner	2025-09-16 23:24:15.230958	\N	\N	2025-09-16 23:24:15.230958	\N
475	business_owner	2025-09-16 23:31:12.459187	\N	\N	2025-09-16 23:31:12.459187	\N
476	business_owner	2025-09-16 23:31:53.563499	\N	\N	2025-09-16 23:31:53.563499	\N
477	customer	2025-09-17 08:53:43.302779	\N	\N	2025-09-17 08:53:43.302779	\N
478	customer	2025-09-17 08:55:19.85625	$2a$10$gK0Hvb2vh5zwv.1h7M8mReyjbtnGzspT77LQg0UGU7IO5cuuLQSSK	Priya@hotmail.com	2025-09-17 08:55:19.85625	\N
479	business_owner	2025-09-17 08:58:09.707654	\N	\N	2025-09-17 08:58:09.707654	\N
480	customer	2025-09-17 09:13:54.805026	\N	\N	2025-09-17 09:13:54.805026	\N
481	customer	2025-09-17 09:20:45.699388	\N	\N	2025-09-17 09:20:45.699388	\N
482	customer	2025-09-17 09:39:06.240871	\N	\N	2025-09-17 09:39:06.240871	\N
483	customer	2025-09-17 10:34:01.432444	\N	\N	2025-09-17 10:34:01.432444	\N
484	business_owner	2025-09-17 10:35:48.333695	\N	\N	2025-09-17 10:35:48.333695	\N
485	customer	2025-09-17 10:42:50.028085	\N	\N	2025-09-17 10:42:50.028085	\N
486	customer	2025-09-17 11:31:25.346394	\N	\N	2025-09-17 11:31:25.346394	\N
487	customer	2025-09-17 15:12:21.68324	\N	\N	2025-09-17 15:12:21.68324	\N
488	customer	2025-09-17 15:30:32.192155	$2a$10$/W2R25vCGNFKAnFIUu0q5.E3DX50viPWu97bAkkUKd7bV4SU3TEUi	shiva@gmail.com	2025-09-17 15:30:32.192155	\N
489	business_owner	2025-09-17 15:32:10.287188	\N	\N	2025-09-17 15:32:10.287188	\N
490	business_owner	2025-09-18 09:37:29.21964	\N	\N	2025-09-18 09:37:29.21964	\N
491	business_owner	2025-09-18 09:54:29.464895	\N	\N	2025-09-18 09:54:29.464895	\N
492	business_owner	2025-09-18 09:56:50.52576	\N	\N	2025-09-18 09:56:50.52576	\N
493	business_owner	2025-09-18 10:10:14.159875	\N	\N	2025-09-18 10:10:14.159875	\N
494	business_owner	2025-09-18 10:11:00.530196	\N	\N	2025-09-18 10:11:00.530196	\N
495	business_owner	2025-09-18 10:11:40.200422	\N	\N	2025-09-18 10:11:40.200422	\N
496	customer	2025-09-18 10:23:25.573539	\N	\N	2025-09-18 10:23:25.573539	\N
497	customer	2025-09-18 10:26:03.192838	\N	\N	2025-09-18 10:26:03.192838	\N
498	customer	2025-09-18 10:26:24.818556	\N	\N	2025-09-18 10:26:24.818556	\N
499	business_owner	2025-09-18 10:51:26.074692	\N	\N	2025-09-18 10:51:26.074692	\N
500	business_owner	2025-09-18 10:52:34.715866	\N	\N	2025-09-18 10:52:34.715866	\N
501	business_owner	2025-09-18 10:56:17.933591	\N	\N	2025-09-18 10:56:17.933591	\N
502	business_owner	2025-09-18 10:57:54.519162	\N	\N	2025-09-18 10:57:54.519162	\N
503	business_owner	2025-09-18 11:02:30.349598	\N	\N	2025-09-18 11:02:30.349598	\N
504	business_owner	2025-09-18 11:02:56.100695	\N	\N	2025-09-18 11:02:56.100695	\N
505	business_owner	2025-09-18 11:18:56.869873	\N	\N	2025-09-18 11:18:56.869873	\N
506	business_owner	2025-09-18 11:19:13.821382	\N	\N	2025-09-18 11:19:13.821382	\N
507	business_owner	2025-09-18 11:19:22.775385	\N	\N	2025-09-18 11:19:22.775385	\N
508	business_owner	2025-09-18 11:26:28.104641	\N	\N	2025-09-18 11:26:28.104641	\N
509	customer	2025-09-18 11:33:39.412559	\N	\N	2025-09-18 11:33:39.412559	\N
510	business_owner	2025-09-18 11:36:24.804199	\N	\N	2025-09-18 11:36:24.804199	\N
511	customer	2025-09-18 11:36:39.951677	\N	\N	2025-09-18 11:36:39.951677	\N
512	customer	2025-09-18 11:38:20.104206	\N	\N	2025-09-18 11:38:20.104206	\N
513	business_owner	2025-09-18 11:41:06.51033	\N	\N	2025-09-18 11:41:06.51033	\N
514	customer	2025-09-18 11:44:22.336645	\N	\N	2025-09-18 11:44:22.336645	\N
515	business_owner	2025-09-18 12:09:41.830184	\N	\N	2025-09-18 12:09:41.830184	\N
516	customer	2025-09-18 12:11:13.419135	\N	\N	2025-09-18 12:11:13.419135	\N
517	business_owner	2025-09-18 12:16:30.975274	\N	\N	2025-09-18 12:16:30.975274	\N
518	customer	2025-09-18 12:17:10.243109	\N	\N	2025-09-18 12:17:10.243109	\N
519	customer	2025-09-18 14:57:51.058298	\N	\N	2025-09-18 14:57:51.058298	\N
520	customer	2025-09-18 15:43:15.564665	\N	\N	2025-09-18 15:43:15.564665	\N
521	customer	2025-09-18 15:46:19.751737	\N	\N	2025-09-18 15:46:19.751737	\N
522	customer	2025-09-18 15:56:20.625564	\N	\N	2025-09-18 15:56:20.625564	\N
523	customer	2025-09-18 15:56:54.880454	\N	\N	2025-09-18 15:56:54.880454	\N
524	customer	2025-09-18 16:45:24.481828	\N	\N	2025-09-18 16:45:24.481828	\N
525	customer	2025-09-18 17:22:27.856324	\N	\N	2025-09-18 17:22:27.856324	\N
526	customer	2025-09-18 20:28:36.056416	\N	\N	2025-09-18 20:28:36.056416	\N
527	customer	2025-09-18 21:09:51.828353	\N	\N	2025-09-18 21:09:51.828353	\N
528	customer	2025-09-18 21:20:34.056566	\N	\N	2025-09-18 21:20:34.056566	\N
529	customer	2025-09-19 09:08:57.574574	\N	\N	2025-09-19 09:08:57.574574	\N
530	customer	2025-09-19 09:28:35.642939	\N	\N	2025-09-19 09:28:35.642939	\N
531	customer	2025-09-19 09:31:10.32615	\N	\N	2025-09-19 09:31:10.32615	\N
557	customer	2025-09-25 14:34:07.599153	\N	\N	2025-09-25 14:34:07.599153	\N
558	customer	2025-09-26 11:11:28.932352	\N	\N	2025-09-26 11:11:28.932352	\N
559	customer	2025-09-26 11:13:22.94167	\N	\N	2025-09-26 11:13:22.94167	\N
533	customer	2025-09-19 11:50:31.659585	\N	\N	2025-09-19 11:50:31.659585	\N
534	customer	2025-09-19 11:50:31.659765	\N	\N	2025-09-19 11:50:31.659765	\N
560	customer	2025-09-26 11:22:09.447007	\N	\N	2025-09-26 11:22:09.447007	\N
561	customer	2025-09-26 13:12:56.912739	\N	\N	2025-09-26 13:12:56.912739	\N
532	customer	2025-09-19 09:32:50.411364	Omgganeshaya3!	uma@gmail.com	2025-09-19 11:56:10.974727	\N
535	business_owner	2025-09-19 11:59:47.80682	\N	\N	2025-09-19 11:59:47.80682	\N
536	business_owner	2025-09-19 12:29:14.674555	\N	\N	2025-09-19 12:29:14.674555	\N
537	customer	2025-09-19 12:31:28.01879	\N	\N	2025-09-19 12:31:28.01879	\N
538	business_owner	2025-09-19 12:35:25.973379	\N	\N	2025-09-19 12:35:25.973379	\N
539	customer	2025-09-19 12:36:08.639384	\N	\N	2025-09-19 12:36:08.639384	\N
540	customer	2025-09-19 14:31:53.339262	\N	\N	2025-09-19 14:31:53.339262	\N
541	customer	2025-09-19 15:03:22.354736	\N	\N	2025-09-19 15:03:22.354736	\N
542	business_owner	2025-09-19 15:03:50.948311	\N	\N	2025-09-19 15:03:50.948311	\N
543	customer	2025-09-19 15:04:36.110839	\N	\N	2025-09-19 15:04:36.110839	\N
565	customer	2025-09-26 14:20:10.293434	$2a$10$gpNi.tWx3KVZd3/WbVb9iuH.MqnMijWvhx/REVGLKRsEik05gRaMy	D@hotmail.com	2025-10-02 16:15:26.487084	\N
544	business_owner	2025-09-19 15:07:01.233029	\N	\N	2025-09-19 15:07:01.233029	\N
545	business_owner	2025-09-21 16:19:53.076676	\N	\N	2025-09-21 16:19:53.076676	\N
546	business_owner	2025-09-21 16:33:11.47283	\N	\N	2025-09-21 16:33:11.47283	\N
547	business_owner	2025-09-21 16:33:17.342639	\N	\N	2025-09-21 16:33:17.342639	\N
550	\N	2025-09-23 14:23:32.534151	$2a$10$FOMp9oTyK.WqcDHYoOfox.QTWIyG9LpS330x5eSqV8xTSqQoTkouG	hanuman@gmail.com	2025-09-23 14:23:32.534151	\N
551	business_owner	2025-09-24 17:08:06.681738	\N	\N	2025-09-24 17:08:06.681738	\N
552	business_owner	2025-09-24 17:08:26.573193	\N	\N	2025-09-24 17:08:26.573193	\N
553	business_owner	2025-09-25 14:22:45.429049	\N	\N	2025-09-25 14:22:45.429049	\N
554	customer	2025-09-25 14:22:59.827937	\N	\N	2025-09-25 14:22:59.827937	\N
555	business_owner	2025-09-25 14:24:37.598768	\N	\N	2025-09-25 14:24:37.598768	\N
556	customer	2025-09-25 14:30:13.226562	\N	\N	2025-09-25 14:30:13.226562	\N
562	customer	2025-09-26 13:21:33.526237	\N	\N	2025-09-26 13:21:33.526237	\N
563	customer	2025-09-26 14:18:26.221721	\N	\N	2025-09-26 14:18:26.221721	\N
564	customer	2025-09-26 14:19:10.695709	\N	\N	2025-09-26 14:19:10.695709	\N
566	customer	2025-09-26 14:21:02.863659	\N	\N	2025-09-26 14:21:02.863659	\N
567	customer	2025-09-26 14:39:34.373908	\N	\N	2025-09-26 14:39:34.373908	\N
568	customer	2025-09-26 15:07:02.97447	\N	\N	2025-09-26 15:07:02.97447	\N
569	customer	2025-09-26 15:08:25.801841	\N	\N	2025-09-26 15:08:25.801841	\N
570	customer	2025-09-26 15:38:38.737221	\N	\N	2025-09-26 15:38:38.737221	\N
571	customer	2025-09-26 16:29:38.441674	\N	\N	2025-09-26 16:29:38.441674	\N
572	customer	2025-09-26 16:37:37.111809	\N	\N	2025-09-26 16:37:37.111809	\N
573	customer	2025-09-26 16:48:38.092108	\N	\N	2025-09-26 16:48:38.092108	\N
574	customer	2025-09-26 17:08:53.41244	\N	\N	2025-09-26 17:08:53.41244	\N
575	customer	2025-09-26 17:30:26.162506	\N	\N	2025-09-26 17:30:26.162506	\N
576	business_owner	2025-09-26 20:15:23.605605	\N	\N	2025-09-26 20:15:23.605605	\N
577	business_owner	2025-09-26 20:18:16.876548	\N	\N	2025-09-26 20:18:16.876548	\N
670	customer	2025-10-07 09:49:10.063031	\N	\N	2025-10-07 09:49:10.063031	\N
671	business_owner	2025-10-07 12:56:51.919663	\N	\N	2025-10-07 12:56:51.919663	\N
672	business_owner	2025-10-08 09:36:47.290882	\N	\N	2025-10-08 09:36:47.290882	\N
578	business_owner	2025-09-26 20:20:18.636078	$2b$10$cCnL8bCud0ZNIw.mT1OTOe2oiZjJiMSnqQeFNDRlBV9HhgQsKUcXi	Diva@hotmail.com	2025-09-26 20:20:18.636078	\N
579	customer	2025-09-28 11:07:31.224857	\N	\N	2025-09-28 11:07:31.224857	\N
580	customer	2025-09-28 11:17:42.609447	\N	\N	2025-09-28 11:17:42.609447	\N
581	customer	2025-09-28 11:37:25.242553	\N	\N	2025-09-28 11:37:25.242553	\N
582	customer	2025-09-28 12:52:25.806107	\N	\N	2025-09-28 12:52:25.806107	\N
583	business_owner	2025-09-28 13:19:15.846387	\N	\N	2025-09-28 13:19:15.846387	\N
584	business_owner	2025-09-28 13:27:24.051003	$2b$10$O6j2XKkrdn7uK7DER9iiVuMOxBSwxlPDHPKbjB3SK4dRBDgu0FtbS	Smitha@gmail.com	2025-09-28 13:27:24.051003	\N
585	customer	2025-09-28 13:39:41.045472	\N	\N	2025-09-28 13:39:41.045472	\N
586	business_owner	2025-09-28 13:41:36.065074	$2b$10$C5xmRa2AE8NVYk.LfBxUuOTOwZIJlUxKe9f6YIAXoWXUclAcBm1ye	arunaR@gmail.com	2025-09-28 13:41:36.065074	\N
587	customer	2025-09-28 13:58:38.162163	\N	\N	2025-09-28 13:58:38.162163	\N
588	business_owner	2025-09-28 14:10:19.135575	\N	\N	2025-09-28 14:10:19.135575	\N
589	business_owner	2025-09-28 14:49:27.423268	\N	\N	2025-09-28 14:49:27.423268	\N
590	customer	2025-09-28 15:20:09.393106	\N	\N	2025-09-28 15:20:09.393106	\N
591	business_owner	2025-09-28 20:42:36.75478	\N	\N	2025-09-28 20:42:36.75478	\N
592	business_owner	2025-09-28 21:08:20.563668	\N	\N	2025-09-28 21:08:20.563668	\N
593	customer	2025-09-29 11:38:37.016744	\N	\N	2025-09-29 11:38:37.016744	\N
594	business_owner	2025-09-30 09:42:01.932477	\N	\N	2025-09-30 09:42:01.932477	\N
595	business_owner	2025-09-30 15:01:31.733365	\N	\N	2025-09-30 15:01:31.733365	\N
596	business_owner	2025-09-30 15:39:50.991531	\N	\N	2025-09-30 15:39:50.991531	\N
597	business_owner	2025-09-30 15:42:33.21988	\N	\N	2025-09-30 15:42:33.21988	\N
598	business_owner	2025-09-30 15:42:55.306371	\N	\N	2025-09-30 15:42:55.306371	\N
599	business_owner	2025-09-30 15:53:47.915352	\N	\N	2025-09-30 15:53:47.915352	\N
600	business_owner	2025-09-30 15:59:36.334683	\N	\N	2025-09-30 15:59:36.334683	\N
601	business_owner	2025-09-30 16:47:02.934142	\N	\N	2025-09-30 16:47:02.934142	\N
602	business_owner	2025-09-30 17:14:30.092783	\N	\N	2025-09-30 17:14:30.092783	\N
603	business_owner	2025-09-30 17:22:18.692417	\N	\N	2025-09-30 17:22:18.692417	\N
604	business_owner	2025-09-30 17:25:18.069689	\N	\N	2025-09-30 17:25:18.069689	\N
605	business_owner	2025-09-30 17:31:29.794525	\N	\N	2025-09-30 17:31:29.794525	\N
606	customer	2025-09-30 17:36:26.211	\N	\N	2025-09-30 17:36:26.211	\N
651	customer	2025-10-04 13:24:32.071725	\N	\N	2025-10-04 13:24:32.071725	\N
607	customer	2025-10-01 14:06:53.203622	\N	\N	2025-10-01 14:06:53.203622	\N
652	business_owner	2025-10-04 13:34:59.554033	\N	\N	2025-10-04 13:34:59.554033	\N
608	business_owner	2025-10-01 14:08:01.921011	\N	\N	2025-10-01 14:08:01.921011	\N
609	business_owner	2025-10-01 14:10:11.68986	\N	\N	2025-10-01 14:10:11.68986	\N
610	business_owner	2025-10-01 14:46:06.436086	\N	\N	2025-10-01 14:46:06.436086	\N
611	business_owner	2025-10-01 16:06:03.459115	\N	\N	2025-10-01 16:06:03.459115	\N
612	customer	2025-10-01 17:34:58.473252	\N	\N	2025-10-01 17:34:58.473252	\N
613	customer	2025-10-01 17:42:52.685238	\N	\N	2025-10-01 17:42:52.685238	\N
614	customer	2025-10-01 20:24:27.543039	\N	\N	2025-10-01 20:24:27.543039	\N
615	customer	2025-10-01 20:25:06.218429	$2a$10$/B8NXp/CNbeOJsVtF5/3c.Wx9zRn3ve8KZYyVC4g8YMHxhYOCN3Nm	lucky@hotmail.com	2025-10-01 20:25:06.218429	\N
616	business_owner	2025-10-02 14:12:32.576328	\N	\N	2025-10-02 14:12:32.576328	\N
617	customer	2025-10-02 14:15:42.351342	\N	\N	2025-10-02 14:15:42.351342	\N
618	customer	2025-10-02 14:19:48.582477	\N	\N	2025-10-02 14:19:48.582477	\N
619	customer	2025-10-02 16:03:02.103787	\N	\N	2025-10-02 16:03:02.103787	\N
620	business_owner	2025-10-02 16:17:16.899089	\N	\N	2025-10-02 16:17:16.899089	\N
621	customer	2025-10-02 16:25:12.454517	\N	\N	2025-10-02 16:25:12.454517	\N
653	customer	2025-10-04 13:36:51.598951	\N	\N	2025-10-04 13:36:51.598951	\N
622	customer	2025-10-02 16:29:28.727705	\N	\N	2025-10-02 16:29:28.727705	\N
623	customer	2025-10-02 16:30:19.199752	$2a$10$48W/FXnmd/oRcynnihAvne.9suq85ci3.R5lVd36N4HtQQnS/O7y2	niya@hotmail.com	2025-10-02 16:30:19.199752	\N
624	customer	2025-10-02 16:34:37.407037	\N	\N	2025-10-02 16:34:37.407037	\N
625	business_owner	2025-10-02 16:36:23.507894	\N	\N	2025-10-02 16:36:23.507894	\N
626	customer	2025-10-02 16:44:57.908324	\N	\N	2025-10-02 16:44:57.908324	\N
627	business_owner	2025-10-02 16:51:03.138643	\N	\N	2025-10-02 16:51:03.138643	\N
628	customer	2025-10-02 16:52:00.859501	\N	\N	2025-10-02 16:52:00.859501	\N
629	customer	2025-10-02 17:06:16.522887	\N	\N	2025-10-02 17:06:16.522887	\N
630	business_owner	2025-10-02 17:15:24.888445	\N	\N	2025-10-02 17:15:24.888445	\N
631	business_owner	2025-10-02 17:17:04.541225	\N	\N	2025-10-02 17:17:04.541225	\N
632	business_owner	2025-10-02 17:21:20.548055	\N	\N	2025-10-02 17:21:20.548055	\N
633	business_owner	2025-10-02 17:26:53.180328	\N	\N	2025-10-02 17:26:53.180328	\N
634	customer	2025-10-02 17:31:14.214467	\N	\N	2025-10-02 17:31:14.214467	\N
635	customer	2025-10-02 20:55:22.957258	\N	\N	2025-10-02 20:55:22.957258	\N
636	customer	2025-10-02 20:56:23.097773	$2a$10$CdB9nlrwWDrQVjb4iA1cJOBylzm4OztYQ81XbGtXHft.mpajkWOLK	vas@hotmail.com	2025-10-02 20:56:23.097773	\N
637	customer	2025-10-02 20:57:17.052305	$2a$10$k1sge9dvW4PKwYuTKJab0e662HGnQ3bXKT/8EZ8HCnKcTPL6884vu	vasu@hotmail.com	2025-10-02 20:57:17.052305	\N
638	customer	2025-10-02 21:21:07.806406	\N	\N	2025-10-02 21:21:07.806406	\N
640	customer	2025-10-03 08:50:37.418504	\N	\N	2025-10-03 08:50:37.418504	\N
641	customer	2025-10-03 08:52:18.090084	$2a$10$0q20PXnFqaOY8KtJojNy2u4Ufy5HgIvP3K/OY8WXFaZQXA9mad9E.	lav@hotmail.com	2025-10-03 08:52:18.090084	\N
642	customer	2025-10-03 08:52:34.100572	\N	\N	2025-10-03 08:52:34.100572	\N
643	business_owner	2025-10-03 09:00:55.955337	\N	\N	2025-10-03 09:00:55.955337	\N
644	business_owner	2025-10-03 10:09:00.725179	\N	\N	2025-10-03 10:09:00.725179	\N
645	customer	2025-10-03 10:19:04.650495	\N	\N	2025-10-03 10:19:04.650495	\N
654	customer	2025-10-04 15:25:05.974838	\N	\N	2025-10-04 15:25:05.974838	\N
655	customer	2025-10-05 10:49:50.844926	\N	\N	2025-10-05 10:49:50.844926	\N
662	business_owner	2025-10-06 14:16:49.795216	\N	\N	2025-10-06 14:16:49.795216	\N
646	customer	2025-10-03 10:28:18.635532	\N	\N	2025-10-03 10:28:18.635532	\N
647	customer	2025-10-03 17:54:12.509604	\N	\N	2025-10-03 17:54:12.509604	\N
648	business_owner	2025-10-03 17:56:10.857949	\N	\N	2025-10-03 17:56:10.857949	\N
649	customer	2025-10-03 17:58:51.474737	\N	\N	2025-10-03 17:58:51.474737	\N
650	customer	2025-10-04 13:19:14.581543	\N	\N	2025-10-04 13:19:14.581543	\N
656	customer	2025-10-05 10:51:07.396291	\N	\N	2025-10-05 10:51:07.396291	\N
657	customer	2025-10-05 11:56:21.878561	\N	\N	2025-10-05 11:56:21.878561	\N
658	customer	2025-10-05 20:47:27.040596	\N	\N	2025-10-05 20:47:27.040596	\N
207	customer	2025-09-05 18:05:19.570668	$2a$10$zwwvdK/vo/oPc7/5Aq1qs./2svfc53rauKnnE.HFh0TRHDqwCfiIm	aruna@hotmail.com	2025-10-05 21:16:03.735181	\N
659	business_owner	2025-10-05 21:18:54.053554	\N	\N	2025-10-05 21:18:54.053554	\N
660	business_owner	2025-10-06 14:07:52.235993	\N	\N	2025-10-06 14:07:52.235993	\N
661	business_owner	2025-10-06 14:12:20.275775	\N	\N	2025-10-06 14:12:20.275775	\N
663	business_owner	2025-10-06 14:19:00.741792	$2b$10$BeFWyZiGP.In7lVNTfz06em1AEVCWE4LFoo2xdU3jC3gT..SIWOzS	smitha@gmail.com	2025-10-06 14:19:00.741792	\N
664	business_owner	2025-10-06 15:35:27.452846	\N	\N	2025-10-06 15:35:27.452846	\N
665	business_owner	2025-10-06 16:20:05.560512	\N	\N	2025-10-06 16:20:05.560512	\N
666	business_owner	2025-10-06 18:10:23.421857	\N	\N	2025-10-06 18:10:23.421857	\N
667	business_owner	2025-10-06 18:12:52.887384	$2b$10$2v4JqGbwrOzMRho3YRpj2e7z/fdFD0o9yA.NwObfuFkwsisEWy2P2	k@gmail.com	2025-10-06 18:12:52.887384	\N
669	business_owner	2025-10-07 09:44:12.100157	\N	\N	2025-10-07 09:44:12.100157	\N
639	customer	2025-10-02 21:22:12.621259	$2a$10$thORvNomun8io5XKgEwnhOnMGp.rAav4JwFddUUAny.jwD8ncPXKe	kuni@hotmail.com	2025-10-24 15:20:11.054477	\N
673	customer	2025-10-08 15:36:20.123597	\N	\N	2025-10-08 15:36:20.123597	\N
674	customer	2025-10-09 09:55:25.382706	\N	\N	2025-10-09 09:55:25.382706	\N
675	business_owner	2025-10-09 09:55:37.118414	\N	\N	2025-10-09 09:55:37.118414	\N
676	customer	2025-10-09 10:04:11.480055	\N	\N	2025-10-09 10:04:11.480055	\N
677	business_owner	2025-10-09 10:04:29.29961	\N	\N	2025-10-09 10:04:29.29961	\N
678	business_owner	2025-10-09 11:28:36.248669	\N	\N	2025-10-09 11:28:36.248669	\N
679	customer	2025-10-09 11:43:24.640742	\N	\N	2025-10-09 11:43:24.640742	\N
680	business_owner	2025-10-09 11:43:32.710991	\N	\N	2025-10-09 11:43:32.710991	\N
681	business_owner	2025-10-09 13:59:38.083788	\N	\N	2025-10-09 13:59:38.083788	\N
682	business_owner	2025-10-09 19:56:02.959312	\N	\N	2025-10-09 19:56:02.959312	\N
683	customer	2025-10-09 20:35:14.720473	\N	\N	2025-10-09 20:35:14.720473	\N
684	business_owner	2025-10-09 20:35:29.890989	\N	\N	2025-10-09 20:35:29.890989	\N
685	business_owner	2025-10-09 20:37:22.325366	\N	\N	2025-10-09 20:37:22.325366	\N
686	business_owner	2025-10-10 09:31:01.189594	\N	\N	2025-10-10 09:31:01.189594	\N
687	customer	2025-10-10 10:38:55.709644	\N	\N	2025-10-10 10:38:55.709644	\N
688	business_owner	2025-10-10 10:53:36.550752	\N	\N	2025-10-10 10:53:36.550752	\N
689	customer	2025-10-10 11:09:27.679068	\N	\N	2025-10-10 11:09:27.679068	\N
690	business_owner	2025-10-10 11:12:30.844962	\N	\N	2025-10-10 11:12:30.844962	\N
691	customer	2025-10-10 11:13:12.313722	\N	\N	2025-10-10 11:13:12.313722	\N
692	business_owner	2025-10-10 11:14:07.546247	\N	\N	2025-10-10 11:14:07.546247	\N
693	customer	2025-10-10 11:34:15.138341	\N	\N	2025-10-10 11:34:15.138341	\N
694	business_owner	2025-10-12 17:09:42.094336	$2b$10$3rC6CUvX2HhYjje.Cln9N.BFX9vlXDzhE2jvp10lgKSwFXb2ZIZqy	anjaneya@hotmail.com	2025-10-12 17:09:42.094336	\N
695	business_owner	2025-10-12 18:54:12.334792	\N	\N	2025-10-12 18:54:12.334792	\N
668	business_owner	2025-10-06 18:15:13.232939	$2b$10$Z9ygnBMbqyFxNx2UMSJ9R.HyhyQbw5iftdX8K9BLmmcwgxk/qImw2	priyanka@gmail.com	2025-10-12 19:35:34.363859	\N
290	business_owner	2025-09-10 17:12:02.177536	$2b$10$sAEMVmP1wLUSmHkuqb5tDOGyEi25r./qPyaCeLTN4mRydGmhbUliW	lakshmi@gmail.com	2025-10-13 15:41:43.3389	\N
696	business_owner	2025-10-22 14:33:09.59347	$2b$10$ksfs8DDMSENoCES9AeohseZnRXg/pkNrIRii7I0rMriKUusUXK20y	lalitha@hotmail.com	2025-10-22 14:33:09.59347	\N
697	business_owner	2025-10-24 16:08:55.152855	$2b$10$4LltlQ7LxShSiIkOw9ZbQ.adiKZc99VcDkgZ2rMQfoBljfBT2X/ay	shri@hotmail.com	2025-10-24 16:08:55.152855	\N
698	business_owner	2025-10-24 17:28:09.357327	$2b$10$u/ov1dmJHRTtOxfp1EoDpONsFe6y0kw7AOEFqUc0LV/ItFR5m8lAa	rama@yahoo.com	2025-10-24 17:28:09.357327	\N
\.


--
-- Name: bookings_booking_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bookings_booking_id_seq', 1, false);


--
-- Name: business_owners_business_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.business_owners_business_id_seq', 72, true);


--
-- Name: customers_customer_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.customers_customer_id_seq', 40, true);


--
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.messages_id_seq', 104, true);


--
-- Name: password_resets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.password_resets_id_seq', 1, false);


--
-- Name: service_categories_category_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.service_categories_category_id_seq', 255, true);


--
-- Name: service_posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.service_posts_id_seq', 47, true);


--
-- Name: services_service_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.services_service_id_seq', 1, false);


--
-- Name: user_devices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_devices_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 698, true);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (booking_id);


--
-- Name: business_owners business_owners_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_owners
    ADD CONSTRAINT business_owners_pkey PRIMARY KEY (business_id);


--
-- Name: business_owners business_owners_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_owners
    ADD CONSTRAINT business_owners_user_id_key UNIQUE (user_id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (customer_id);


--
-- Name: customers customers_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_user_id_key UNIQUE (user_id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: password_resets password_resets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_pkey PRIMARY KEY (id);


--
-- Name: password_resets password_resets_reset_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_reset_token_key UNIQUE (reset_token);


--
-- Name: service_categories service_categories_category_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_categories
    ADD CONSTRAINT service_categories_category_name_key UNIQUE (category_name);


--
-- Name: service_categories service_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_categories
    ADD CONSTRAINT service_categories_pkey PRIMARY KEY (category_id);


--
-- Name: service_posts service_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_posts
    ADD CONSTRAINT service_posts_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (service_id);


--
-- Name: user_devices user_devices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_devices
    ADD CONSTRAINT user_devices_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (session_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: idx_service_posts_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_service_posts_category ON public.service_posts USING btree (service_category);


--
-- Name: idx_service_posts_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_service_posts_created_at ON public.service_posts USING btree (created_at DESC);


--
-- Name: idx_service_posts_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_service_posts_is_active ON public.service_posts USING btree (is_active);


--
-- Name: idx_service_posts_location; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_service_posts_location ON public.service_posts USING btree (zip_code, city, state);


--
-- Name: idx_service_posts_post_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_service_posts_post_type ON public.service_posts USING btree (post_type);


--
-- Name: idx_service_posts_poster_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_service_posts_poster_type ON public.service_posts USING btree (poster_type);


--
-- Name: idx_service_posts_service_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_service_posts_service_category ON public.service_posts USING btree (service_category);


--
-- Name: idx_service_posts_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_service_posts_status ON public.service_posts USING btree (status);


--
-- Name: idx_service_posts_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_service_posts_user_id ON public.service_posts USING btree (user_id);


--
-- Name: idx_service_posts_zip_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_service_posts_zip_code ON public.service_posts USING btree (zip_code);


--
-- Name: service_posts service_posts_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER service_posts_updated_at BEFORE UPDATE ON public.service_posts FOR EACH ROW EXECUTE FUNCTION public.update_service_posts_updated_at();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bookings bookings_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owners(business_id) ON DELETE CASCADE;


--
-- Name: bookings bookings_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE CASCADE;


--
-- Name: bookings bookings_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(service_id);


--
-- Name: business_owners business_owners_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_owners
    ADD CONSTRAINT business_owners_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: customers customers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: password_resets password_resets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: service_posts service_posts_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_posts
    ADD CONSTRAINT service_posts_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.service_categories(category_id);


--
-- Name: service_posts service_posts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_posts
    ADD CONSTRAINT service_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: services services_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_owners(business_id) ON DELETE CASCADE;


--
-- Name: services services_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.service_categories(category_id);


--
-- Name: user_devices user_devices_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_devices
    ADD CONSTRAINT user_devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

