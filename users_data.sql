--
-- PostgreSQL database dump
--

\restrict PSOjZVZYiLcfiHFmBa3u4sS41OlKhI89t4T9T2gHnwBFDcARzXbSauBhyH7qTDw

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

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
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, name, password, role, avatar, created_at, updated_at) FROM stdin;
1491ed63-9ed8-4aa7-ab09-aa689210244c	demo@finresearch.ai	Alex Morgan	$2b$10$k3Yf7/qr0t8xddYGZI2KRuKDq4fooGIqP.jCa82jsKlYje4hJVnya	analyst	\N	2026-09-18 21:55:23.537191	2026-09-18 21:55:23.537191
cffe633d-9e37-4441-9313-506a389f6627	student@finresearch.ai	Jordan Chen	$2b$10$k3Yf7/qr0t8xddYGZI2KRuKDq4fooGIqP.jCa82jsKlYje4hJVnya	student	\N	2026-09-18 21:55:23.537191	2026-09-18 21:55:23.537191
7b70af55-2472-4baa-93a0-a8524bca0921	gauravprofessional786@gmail.com	Gaurav Singh	$2b$10$VEr6S/8qvGPb1TYsRFkx3ObZl4EWEyTEK2sMIV9IpqXHmlrXJGeuu	analyst	\N	2026-09-18 23:09:32.389711	2026-09-18 23:09:32.389711
\.


--
-- PostgreSQL database dump complete
--

\unrestrict PSOjZVZYiLcfiHFmBa3u4sS41OlKhI89t4T9T2gHnwBFDcARzXbSauBhyH7qTDw

