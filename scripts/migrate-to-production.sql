-- ======================================================
  -- Pereirão Express - Migration Script: Dev → Production
  -- Generated: 2026-03-08T19:00:13.669Z
  -- ======================================================
  -- This script migrates all users, profiles, categories,
  -- provider availability, and symptom knowledge base from
  -- development to production database.
  -- Run this script against your PRODUCTION database.
  -- ======================================================

  BEGIN;

  -- 1. SERVICE CATEGORIES (upsert)
  INSERT INTO service_categories (id, name, icon, description, base_price, created_at) VALUES
  "(1,'Encanamento','droplet','Vazamentos, entupimentos, instalações hidráulicas',15000,'2026-02-02 13:13:17.522617'),
(2,'Elétrica','zap','Instalações elétricas, curtos-circuitos, tomadas',12000,'2026-02-02 13:13:17.528791'),
(3,'Pintura','paintbrush','Pintura interna e externa, texturas',20000,'2026-02-02 13:13:17.533827'),
(4,'Marcenaria','hammer','Móveis, portas, janelas, reparos em madeira',18000,'2026-02-02 13:13:17.537411'),
(5,'Ar Condicionado','wind','Instalação, manutenção e limpeza de AC',25000,'2026-02-02 13:13:17.54019'),
(6,'Limpeza','sparkles','Limpeza residencial e comercial',10000,'2026-02-02 13:13:17.543452'),
(7,'Passadeira','shirt','Serviço de passar roupas',8000,'2026-02-04 18:01:32.356389'),
(8,'Chaveiro','key','Abertura de portas, troca de fechaduras, cópias de chaves',8000,'2026-02-13 18:17:08.727228'),
(9,'Portões','door-open','Instalação, manutenção e reparo de portões automáticos',12000,'2026-02-13 18:17:08.727228')"
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    description = EXCLUDED.description,
    base_price = EXCLUDED.base_price;

  SELECT setval('service_categories_id_seq', (SELECT MAX(id) FROM service_categories));

  -- 2. USERS (upsert)
  INSERT INTO users (id, email, first_name, last_name, profile_image_url, created_at, updated_at, password, cpf, phone, age, city, latitude, longitude, pix_key_type, pix_key, bank_name, bank_agency, bank_account) VALUES
  "('test-user-123','testuser@example.com','Jo�o','Silva',NULL,'2026-02-02 14:03:37.486589','2026-02-02 14:03:37.486589',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
('user-xyz-789','joao@test.com','Jo�o','Pereira',NULL,'2026-02-02 14:12:51.719698','2026-02-02 14:12:51.719698',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
('voice-user-123','voicetest@test.com','Maria','Voz',NULL,'2026-02-02 14:56:26.93686','2026-02-02 14:56:26.93686',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
('3f2a55d0-838f-4fa9-a22d-b5b9270123ea','cliente@pereirao.com','João','Cliente','/objects/uploads/f2c5fb7a-9ebd-41a1-871b-0513d4827f96','2026-02-04 14:51:33.368497','2026-02-04 14:51:33.368497','$2b$12$LepNWY8aUdv1CKZO8HAs/.dDvL/3T6oIFl9plZbzoR5OTR/uCbDZm','123.456.789-00','(11) 99999-1111',35,'Ibitinga - SP',-21.7562300,-48.8319030,NULL,NULL,NULL,NULL,NULL),
('icon-test-456','icontest@test.com','Carlos','Silva',NULL,'2026-02-02 18:38:29.863479','2026-02-02 18:38:29.863479',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
('chat-test-789','chattest@test.com','Maria','Santos',NULL,'2026-02-02 19:03:13.448711','2026-02-02 19:03:13.448711',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
('prov-pintor-1','pintor.premium@pereirao.com','Antonio','Pintor Premium',NULL,'2026-02-05 10:04:44.262936','2026-02-05 10:04:44.262936','$2b$12$b/aXXF.2zXnUIqHRKXel6uYrMXzOTKmzPRyvdH9BPOodKVErX4H2e','33333333331','11999990007',55,'São Paulo',-23.5506507,-46.6333824,NULL,NULL,NULL,NULL,NULL),
('44f01a8b-bb6f-460d-87ca-b5ae4955e48a','test-hjuI5-@test.com','João','Silva',NULL,'2026-02-02 22:52:20.815094','2026-02-02 22:52:20.815094','$2b$12$82WKKJuHofoJn3b59vZNFODxqNo9Ou6Kchuesq.VyM2mvagfYRcRi','12345678909','11912345678',30,'São Paulo',-23.5506507,-46.6333824,NULL,NULL,NULL,NULL,NULL),
('e639232d-427c-43d7-9da1-1bc8bd5c45f5','prestador@pereirao.com','Maria','Prestadora',NULL,'2026-02-04 14:51:46.977618','2026-02-04 14:51:46.977618','$2b$12$LepNWY8aUdv1CKZO8HAs/.dDvL/3T6oIFl9plZbzoR5OTR/uCbDZm','987.654.321-00','(11) 99999-2222',40,'São Paulo',-23.5506507,-46.6333824,NULL,NULL,NULL,NULL,NULL),
('materials-test-123','materialstest@test.com','Pedro','Oliveira',NULL,'2026-02-02 19:52:59.741452','2026-02-02 19:52:59.741452',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
('prov-encanador-1','encanador.premium@pereirao.com','José','Encanador Premium',NULL,'2026-02-05 10:04:44.262936','2026-02-05 10:04:44.262936','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiLXCJzCTbQK','11111111111','11999990001',45,'São Paulo',-23.5506507,-46.6333824,NULL,NULL,NULL,NULL,NULL),
('43747330','equipevidah@gmail.com','william ','teixeira haddad',NULL,'2026-02-02 14:49:22.503474','2026-02-02 20:25:20.871',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
('0f8f2f98-150e-4a4a-b2d5-762eb8d21c39','admin@pereirao.com','Carlos','Administrador',NULL,'2026-02-04 14:51:51.241854','2026-02-04 14:51:51.241854','$2b$12$ax2hze35l2SLVa8nfyL24uhtu75NYiv9/i4Z1VUDHsVQl5BtmFSZu','111.222.333-44','(11) 99999-3333',45,'São Paulo',-23.5506507,-46.6333824,NULL,NULL,NULL,NULL,NULL),
('prov-encanador-2','encanador.experiente@pereirao.com','Carlos','Encanador Experiente',NULL,'2026-02-05 10:04:44.262936','2026-02-05 10:04:44.262936','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiLXCJzCTbQK','11111111112','11999990002',38,'São Paulo',-23.5506507,-46.6333824,NULL,NULL,NULL,NULL,NULL),
('prov-encanador-3','encanador.iniciante@pereirao.com','Pedro','Encanador Novo',NULL,'2026-02-05 10:04:44.262936','2026-02-05 10:04:44.262936','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiLXCJzCTbQK','11111111113','11999990003',25,'São Paulo',-23.5506507,-46.6333824,NULL,NULL,NULL,NULL,NULL),
('prov-eletricista-1','eletricista.premium@pereirao.com','Roberto','Eletricista Premium',NULL,'2026-02-05 10:04:44.262936','2026-02-05 10:04:44.262936','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiLXCJzCTbQK','22222222221','11999990004',50,'São Paulo',-23.5506507,-46.6333824,NULL,NULL,NULL,NULL,NULL),
('prov-eletricista-2','eletricista.experiente@pereirao.com','Marcos','Eletricista Experiente',NULL,'2026-02-05 10:04:44.262936','2026-02-05 10:04:44.262936','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiLXCJzCTbQK','22222222222','11999990005',42,'São Paulo',-23.5506507,-46.6333824,NULL,NULL,NULL,NULL,NULL),
('prov-eletricista-3','eletricista.regular@pereirao.com','Lucas','Eletricista Regular',NULL,'2026-02-05 10:04:44.262936','2026-02-05 10:04:44.262936','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiLXCJzCTbQK','22222222223','11999990006',28,'São Paulo',-23.5506507,-46.6333824,NULL,NULL,NULL,NULL,NULL),
('prov-pintor-2','pintor.experiente@pereirao.com','Francisco','Pintor Experiente',NULL,'2026-02-05 10:04:44.262936','2026-02-05 10:04:44.262936','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiLXCJzCTbQK','33333333332','11999990008',40,'São Paulo',-23.5506507,-46.6333824,NULL,NULL,NULL,NULL,NULL),
('prov-pintor-3','pintor.iniciante@pereirao.com','Rafael','Pintor Iniciante',NULL,'2026-02-05 10:04:44.262936','2026-02-05 10:04:44.262936','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiLXCJzCTbQK','33333333333','11999990009',22,'São Paulo',-23.5506507,-46.6333824,NULL,NULL,NULL,NULL,NULL),
('prov-marceneiro-1','marceneiro.premium@pereirao.com','Sebastião','Marceneiro Premium',NULL,'2026-02-05 10:04:44.262936','2026-02-05 10:04:44.262936','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiLXCJzCTbQK','44444444441','11999990010',52,'São Paulo',-23.5506507,-46.6333824,NULL,NULL,NULL,NULL,NULL),
('prov-marceneiro-2','marceneiro.experiente@pereirao.com','João','Marceneiro Experiente',NULL,'2026-02-05 10:04:44.262936','2026-02-05 10:04:44.262936','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiLXCJzCTbQK','44444444442','11999990011',35,'São Paulo',-23.5506507,-46.6333824,NULL,NULL,NULL,NULL,NULL),
('prov-marceneiro-3','marceneiro.regular@pereirao.com','Gabriel','Marceneiro Regular',NULL,'2026-02-05 10:04:44.262936','2026-02-05 10:04:44.262936','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiLXCJzCTbQK','44444444443','11999990012',30,'São Paulo',-23.5506507,-46.6333824,NULL,NULL,NULL,NULL,NULL),
('prov-arcond-1','arcond.premium@pereirao.com','Renato','Técnico AC Premium',NULL,'2026-02-05 10:04:44.262936','2026-02-05 10:04:44.262936','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiLXCJzCTbQK','55555555551','11999990013',48,'São Paulo',-23.5506507,-46.6333824,NULL,NULL,NULL,NULL,NULL),
('prov-arcond-2','arcond.experiente@pereirao.com','Fernando','Técnico AC Experiente',NULL,'2026-02-05 10:04:44.262936','2026-02-05 10:04:44.262936','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiLXCJzCTbQK','55555555552','11999990014',36,'São Paulo',-23.5506507,-46.6333824,NULL,NULL,NULL,NULL,NULL),
('prov-arcond-3','arcond.iniciante@pereirao.com','Thiago','Técnico AC Novo',NULL,'2026-02-05 10:04:44.262936','2026-02-05 10:04:44.262936','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiLXCJzCTbQK','55555555553','11999990015',24,'São Paulo',-23.5506507,-46.6333824,NULL,NULL,NULL,NULL,NULL),
('prov-limpeza-1','limpeza.premium@pereirao.com','Maria','Diarista Premium',NULL,'2026-02-05 10:04:44.262936','2026-02-05 10:04:44.262936','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiLXCJzCTbQK','66666666661','11999990016',45,'São Paulo',-23.5506507,-46.6333824,NULL,NULL,NULL,NULL,NULL),
('prov-limpeza-2','limpeza.experiente@pereirao.com','Ana','Diarista Experiente',NULL,'2026-02-05 10:04:44.262936','2026-02-05 10:04:44.262936','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiLXCJzCTbQK','66666666662','11999990017',38,'São Paulo',-23.5506507,-46.6333824,NULL,NULL,NULL,NULL,NULL),
('prov-limpeza-3','limpeza.regular@pereirao.com','Julia','Diarista Regular',NULL,'2026-02-05 10:04:44.262936','2026-02-05 10:04:44.262936','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiLXCJzCTbQK','66666666663','11999990018',26,'São Paulo',-23.5506507,-46.6333824,NULL,NULL,NULL,NULL,NULL),
('prov-passadeira-1','passadeira.premium@pereirao.com','Rosa','Passadeira Premium',NULL,'2026-02-05 10:04:44.262936','2026-02-05 10:04:44.262936','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiLXCJzCTbQK','77777777771','11999990019',50,'São Paulo',-23.5506507,-46.6333824,NULL,NULL,NULL,NULL,NULL),
('prov-passadeira-2','passadeira.experiente@pereirao.com','Lucia','Passadeira Experiente',NULL,'2026-02-05 10:04:44.262936','2026-02-05 10:04:44.262936','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiLXCJzCTbQK','77777777772','11999990020',40,'São Paulo',-23.5506507,-46.6333824,NULL,NULL,NULL,NULL,NULL),
('prov-passadeira-3','passadeira.iniciante@pereirao.com','Fernanda','Passadeira Nova',NULL,'2026-02-05 10:04:44.262936','2026-02-05 10:04:44.262936','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiLXCJzCTbQK','77777777773','11999990021',23,'São Paulo',-23.5506507,-46.6333824,NULL,NULL,NULL,NULL,NULL),
('test-admin-001','admin@teste.com','Carlos','Administrador',NULL,'2026-02-13 18:42:53.35467','2026-02-13 18:42:53.35467','$2b$12$p0rX1q9tQPTj1QngtMCf5euL39ikq/Gnyqs1ndb47vgas77mSyazC','111.222.333-44','(11) 99999-3333',35,'São Paulo',NULL,NULL,NULL,NULL,NULL,NULL,NULL),
('test-provider-001','prestador@teste.com','João','Santos',NULL,'2026-02-13 18:42:49.30768','2026-02-13 18:42:49.30768','$2b$12$p0rX1q9tQPTj1QngtMCf5euL39ikq/Gnyqs1ndb47vgas77mSyazC','987.654.321-00','(11) 99999-2222',40,'São Paulo',NULL,NULL,'cpf','123.456.789-00','Nubank','0001','12345-6'),
('test-client-001','cliente@teste.com','Maria','Silva',NULL,'2026-02-13 18:42:45.351156','2026-02-13 18:42:45.351156','$2b$12$p0rX1q9tQPTj1QngtMCf5euL39ikq/Gnyqs1ndb47vgas77mSyazC','123.456.789-09','(11) 99999-1111',32,'São Paulo',-21.7455721,-48.8467840,NULL,NULL,NULL,NULL,NULL),
('prov-passadeira-local-1','passadeira.local@teste.com','Ana','Costa Passadeira',NULL,'2026-03-08 18:16:47.696775','2026-03-08 18:16:47.696775','$2b$12$kIUexP3SaqpxmjUF7EyjsOy1d2zvJ74usjbdRxfTUxNgyKjiNbyoa',NULL,NULL,NULL,NULL,-21.7520000,-48.8380000,NULL,NULL,NULL,NULL,NULL)"
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    password = EXCLUDED.password,
    cpf = EXCLUDED.cpf,
    phone = EXCLUDED.phone,
    age = EXCLUDED.age,
    city = EXCLUDED.city,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    updated_at = NOW();

  -- 3. USER PROFILES (upsert)
  INSERT INTO user_profiles (id, user_id, role, phone, address, bio, specialties, rating, total_services, is_available, created_at, city, document_url, document_status, document_notes, terms_accepted, terms_accepted_at, total_ratings) VALUES
  "(87e9bcb4-890e-4780-81f9-f210d618839c,'44f01a8b-bb6f-460d-87ca-b5ae4955e48a','client','11912345678',NULL,NULL,NULL,0.0,0,true,'2026-02-02 22:52:20.85489','São Paulo',NULL,'pending',NULL,false,NULL,0),
(1f3fbd8c-0dca-4dc2-8460-3f6dbb901f05,'e639232d-427c-43d7-9da1-1bc8bd5c45f5','provider',NULL,NULL,NULL,NULL,45.0,10,true,'2026-02-04 14:53:04.549342','São Paulo',NULL,'pending',NULL,false,NULL,0),
(25e01094-5ba5-46cc-85b7-f5fa0e396c7f,'prov-encanador-1','provider','11999990001',NULL,NULL,'Encanamento,Vazamentos,Instalação hidráulica',10.0,120,true,'2026-02-05 10:05:09.625256','São Paulo',NULL,'pending',NULL,true,NULL,85),
(00d60fc2-9e19-46ee-8082-9e00f7035a16,'prov-encanador-2','provider','11999990002',NULL,NULL,'Encanamento,Desentupimento',9.0,68,true,'2026-02-05 10:05:09.625256','São Paulo',NULL,'pending',NULL,true,NULL,45),
(04c4cc22-4364-4ca9-9bf9-8c8ab14cf5ff,'prov-encanador-3','provider','11999990003',NULL,NULL,'Encanamento básico',4.5,5,true,'2026-02-05 10:05:09.625256','São Paulo',NULL,'pending',NULL,true,NULL,3),
(15b37b6a-70b2-46c5-86a5-41259d054b6b,'prov-eletricista-1','provider','11999990004',NULL,NULL,'Elétrica,Instalações,Quadros elétricos',10.0,150,true,'2026-02-05 10:05:09.625256','São Paulo',NULL,'pending',NULL,true,NULL,92),
(353959e2-0e5d-4170-8633-4b41609a33c6,'prov-eletricista-2','provider','11999990005',NULL,NULL,'Elétrica,Manutenção',9.0,78,true,'2026-02-05 10:05:09.625256','São Paulo',NULL,'pending',NULL,true,NULL,52),
(b54320b5-0562-44c7-8e42-0041a2364ec9,'prov-eletricista-3','provider','11999990006',NULL,NULL,'Elétrica residencial',7.2,18,true,'2026-02-05 10:05:09.625256','São Paulo',NULL,'pending',NULL,true,NULL,12),
(c667e14f-6d35-4078-be53-01e9fb5faf54,'prov-pintor-1','provider','11999990007',NULL,NULL,'Pintura,Textura,Decoração',10.0,95,true,'2026-02-05 10:05:09.625256','São Paulo',NULL,'pending',NULL,true,NULL,78),
(d7fd01ab-dfee-4181-835c-183df31d0642,'prov-pintor-2','provider','11999990008',NULL,NULL,'Pintura interna,Pintura externa',9.0,55,true,'2026-02-05 10:05:09.625256','São Paulo',NULL,'pending',NULL,true,NULL,40),
(1ee59c35-913e-48e3-9438-6d872402e14c,'prov-pintor-3','provider','11999990009',NULL,NULL,'Pintura básica',3.8,3,true,'2026-02-05 10:05:09.625256','São Paulo',NULL,'pending',NULL,true,NULL,2),
(0718f284-1ad5-4cef-9781-12c653497cc6,'prov-marceneiro-1','provider','11999990010',NULL,NULL,'Marcenaria,Móveis planejados,Reparos',10.0,88,true,'2026-02-05 10:05:09.625256','São Paulo',NULL,'pending',NULL,true,NULL,65),
(260a0937-ca33-4f59-a046-5ba3d7cf8be4,'prov-marceneiro-2','provider','11999990011',NULL,NULL,'Marcenaria,Portas,Janelas',9.0,48,true,'2026-02-05 10:05:09.625256','São Paulo',NULL,'pending',NULL,true,NULL,35),
(1539ab80-c96d-419c-b994-657d87c25bfb,'prov-marceneiro-3','provider','11999990012',NULL,NULL,'Marcenaria simples',6.5,12,true,'2026-02-05 10:05:09.625256','São Paulo',NULL,'pending',NULL,true,NULL,8),
(5014b9ea-1143-4bdc-bad2-7459349d6a2b,'prov-arcond-1','provider','11999990013',NULL,NULL,'Ar condicionado,Instalação,Manutenção',10.0,110,true,'2026-02-05 10:05:09.625256','São Paulo',NULL,'pending',NULL,true,NULL,70),
(90e8db2a-9cd4-442b-adcc-1c745810c199,'prov-arcond-2','provider','11999990014',NULL,NULL,'Ar condicionado,Limpeza',9.0,52,true,'2026-02-05 10:05:09.625256','São Paulo',NULL,'pending',NULL,true,NULL,38),
(f1e8aa5b-63d0-4aae-9dc3-2261557f0b5a,'prov-arcond-3','provider','11999990015',NULL,NULL,'Ar condicionado básico',4.2,6,true,'2026-02-05 10:05:09.625256','São Paulo',NULL,'pending',NULL,true,NULL,4),
(bc78280b-f9e0-4af5-b3c0-45f285e872d9,'prov-limpeza-1','provider','11999990016',NULL,NULL,'Limpeza,Empregada Doméstica,Faxina completa',10.0,200,true,'2026-02-05 10:05:09.625256','São Paulo',NULL,'pending',NULL,true,NULL,95),
(7f8511fe-f8fd-4141-a47b-5cb0f7744620,'prov-limpeza-2','provider','11999990017',NULL,NULL,'Limpeza,Empregada Doméstica',9.0,90,true,'2026-02-05 10:05:09.625256','São Paulo',NULL,'pending',NULL,true,NULL,55),
(dbde5a1b-a3c2-463f-b0b3-9fbcf35d578b,'prov-limpeza-3','provider','11999990018',NULL,NULL,'Limpeza básica,Empregada Doméstica',7.0,22,true,'2026-02-05 10:05:09.625256','São Paulo',NULL,'pending',NULL,true,NULL,15),
(98dc7288-6c7c-4b4e-bb66-beb8dbe891e5,'prov-passadeira-1','provider','11999990019',NULL,NULL,'Passadeira,Passar roupa',10.0,180,true,'2026-02-05 10:05:09.625256','São Paulo',NULL,'pending',NULL,true,NULL,88),
(d68ce549-8280-44e5-b02c-5186c746d435,'prov-passadeira-2','provider','11999990020',NULL,NULL,'Passadeira',9.0,75,true,'2026-02-05 10:05:09.625256','São Paulo',NULL,'pending',NULL,true,NULL,48),
(d885d58e-ae05-4dcf-98a8-17d33ed03110,'prov-passadeira-3','provider','11999990021',NULL,NULL,'Passadeira iniciante',4.0,4,true,'2026-02-05 10:05:09.625256','São Paulo',NULL,'pending',NULL,true,NULL,2),
(0b94a790-f08b-42e5-b9d9-15bb9b7df326,'3f2a55d0-838f-4fa9-a22d-b5b9270123ea','client','(11) 99999-1111','Rua Alberto Miorali, Jardim Planalto',NULL,NULL,0.0,0,true,'2026-02-04 14:53:00.633218','Ibitinga - SP',NULL,'pending',NULL,false,NULL,0),
(profile-client-001,'test-client-001','client','(11) 99999-1111',NULL,NULL,NULL,10.0,0,true,'2026-02-13 18:43:03.229861','São Paulo',NULL,'pending',NULL,true,NULL,0),
(profile-provider-001,'test-provider-001','provider','(11) 99999-2222',NULL,'Eletricista e encanador profissional com 10 anos de experiência.','[""Elétrica"", ""Encanamento"", ""Ar Condicionado""]',10.0,15,true,'2026-02-13 18:43:07.506359','São Paulo',NULL,'pending',NULL,true,NULL,5),
(profile-admin-001,'test-admin-001','admin','(11) 99999-3333',NULL,NULL,NULL,10.0,0,true,'2026-02-13 18:43:11.605626','São Paulo',NULL,'pending',NULL,true,NULL,0),
(02367e63-9184-4fa3-8e4c-49a39892fc9f,'prov-passadeira-local-1','provider','(16) 99999-8888',NULL,NULL,'Passadeira,Passar roupa',9.2,95,true,'2026-03-08 18:17:22.659489','Araraquara',NULL,'approved',NULL,true,NULL,62),
(0901ad6d-a721-4372-a427-965c70c8194b,'admin-001','admin','(11) 99999-0000',NULL,NULL,NULL,10.0,0,true,'2026-03-08 18:18:04.023905','São Paulo',NULL,'approved',NULL,true,NULL,0),
(5614594b-725d-4ddf-85ca-7cf1d7139a64,'0f8f2f98-150e-4a4a-b2d5-762eb8d21c39','admin',NULL,NULL,NULL,NULL,0.0,0,true,'2026-02-04 14:53:09.45694','São Paulo',NULL,'pending',NULL,false,NULL,0)"
  ON CONFLICT (user_id) DO UPDATE SET
    role = EXCLUDED.role,
    phone = EXCLUDED.phone,
    bio = EXCLUDED.bio,
    specialties = EXCLUDED.specialties,
    rating = EXCLUDED.rating,
    total_services = EXCLUDED.total_services,
    is_available = EXCLUDED.is_available,
    city = EXCLUDED.city,
    total_ratings = EXCLUDED.total_ratings;

  SELECT setval('user_profiles_id_seq', (SELECT MAX(id) FROM user_profiles));

  -- 4. PROVIDER AVAILABILITY (replace all)
  DELETE FROM provider_availability;
  INSERT INTO provider_availability (id, user_id, day_of_week, start_time, end_time, is_active, created_at) VALUES
  "(1,'prov-passadeira-local-1',1,'08:00','17:00',true,'2026-03-08 18:30:22.256779'),
(2,'prov-passadeira-local-1',2,'08:00','17:00',true,'2026-03-08 18:30:22.256779'),
(3,'prov-passadeira-local-1',3,'08:00','17:00',true,'2026-03-08 18:30:22.256779'),
(4,'prov-passadeira-local-1',4,'08:00','17:00',true,'2026-03-08 18:30:22.256779'),
(5,'prov-passadeira-local-1',5,'08:00','17:00',true,'2026-03-08 18:30:22.256779'),
(6,'prov-passadeira-local-1',6,'08:00','12:00',true,'2026-03-08 18:30:22.256779')";

  SELECT setval('provider_availability_id_seq', (SELECT MAX(id) FROM provider_availability));

  -- 5. SYMPTOMS (upsert)
  INSERT INTO symptoms (id, category_id, name, description, keywords, created_at) VALUES
  "(1,1,'Torneira pingando','Torneira que não fecha completamente e fica gotejando água','[""torneira"",""pingando"",""gotejando"",""goteira"",""vazando"",""não fecha""]','2026-02-13 18:24:36.090026'),
(2,1,'Pia entupida','Pia da cozinha ou banheiro que não escoa a água corretamente','[""pia"",""entupida"",""não desce"",""água parada"",""lenta"",""ralo""]','2026-02-13 18:24:36.090026'),
(3,1,'Vaso sanitário entupido','Vaso sanitário com obstrução que não dá descarga corretamente','[""vaso"",""sanitário"",""entupido"",""privada"",""descarga"",""não desce""]','2026-02-13 18:24:36.090026'),
(4,1,'Vazamento na parede','Mancha de umidade ou água escorrendo pela parede','[""vazamento"",""parede"",""mancha"",""úmido"",""infiltração"",""água""]','2026-02-13 18:24:36.090026'),
(5,1,'Descarga não para de correr','Caixa acoplada ou válvula de descarga com água correndo sem parar','[""descarga"",""não para"",""correndo"",""caixa"",""válvula"",""desperdiçando""]','2026-02-13 18:24:36.090026'),
(6,1,'Cano furado/quebrado','Cano de PVC ou cobre com furo ou rachadura causando vazamento','[""cano"",""furado"",""quebrado"",""rachado"",""vazando"",""estourou""]','2026-02-13 18:24:36.090026'),
(7,1,'Chuveiro sem pressão','Chuveiro com pouca pressão de água ou saindo fraco','[""chuveiro"",""pressão"",""fraco"",""pouca água"",""sem força""]','2026-02-13 18:24:36.090026'),
(8,1,'Mau cheiro no ralo','Cheiro forte de esgoto vindo do ralo do banheiro ou cozinha','[""mau cheiro"",""ralo"",""fedor"",""esgoto"",""banheiro"",""cozinha""]','2026-02-13 18:24:36.090026'),
(9,1,'Caixa d''água com problema','Caixa d''água transbordando, não enchendo ou com vazamento','[""caixa"",""água"",""transbordando"",""não enche"",""boia"",""vazando""]','2026-02-13 18:24:36.090026'),
(10,1,'Aquecedor não funciona','Aquecedor a gás ou elétrico que não esquenta a água','[""aquecedor"",""não esquenta"",""água fria"",""gás"",""piloto"",""boiler""]','2026-02-13 18:24:36.090026'),
(11,2,'Tomada não funciona','Tomada que parou de funcionar ou não dá energia aos aparelhos','[""tomada"",""não funciona"",""sem energia"",""parou"",""morta""]','2026-02-13 18:24:54.701241'),
(12,2,'Disjuntor desarmando','Disjuntor que cai/desarma repetidamente ao ligar aparelhos','[""disjuntor"",""desarmando"",""caindo"",""desarma"",""cai"",""energia""]','2026-02-13 18:24:54.701241'),
(13,2,'Cheiro de queimado elétrico','Cheiro de fio queimado ou plástico derretendo na instalação','[""cheiro"",""queimado"",""fio"",""derretendo"",""fumaça"",""queimando""]','2026-02-13 18:24:54.701241'),
(14,2,'Choque na torneira/chuveiro','Sensação de choque ao tocar torneira, registro ou chuveiro','[""choque"",""torneira"",""chuveiro"",""aterramento"",""formigamento""]','2026-02-13 18:24:54.701241'),
(15,2,'Luz piscando/oscilando','Lâmpadas piscando, oscilando ou variando a intensidade','[""luz"",""piscando"",""oscilando"",""fraca"",""variando"",""intermitente""]','2026-02-13 18:24:54.701241'),
(16,2,'Queda de energia parcial','Parte da casa ficou sem energia enquanto outra parte funciona','[""queda"",""energia"",""parcial"",""metade"",""cômodo"",""sem luz""]','2026-02-13 18:24:54.701241'),
(17,2,'Tomada esquentando','Tomada ficando quente ao conectar aparelhos ou mesmo sem uso','[""tomada"",""quente"",""esquentando"",""derretendo"",""quentando""]','2026-02-13 18:24:54.701241'),
(18,2,'Ventilador de teto com problema','Ventilador que não liga, faz barulho ou treme no teto','[""ventilador"",""teto"",""barulho"",""treme"",""não liga"",""balançando""]','2026-02-13 18:24:54.701241'),
(19,2,'Campainha/interfone não funciona','Campainha ou interfone que parou de funcionar ou com ruído','[""campainha"",""interfone"",""não funciona"",""mudo"",""ruído""]','2026-02-13 18:24:54.701241'),
(20,2,'Falta energia em toda casa','Casa inteira sem energia elétrica','[""sem energia"",""casa toda"",""apagou"",""tudo"",""escuro"",""geral""]','2026-02-13 18:24:54.701241'),
(21,3,'Parede com mofo/bolor','Manchas escuras de mofo ou bolor em parede interna','[""mofo"",""bolor"",""mancha"",""escura"",""fungo"",""parede"",""preto""]','2026-02-13 18:25:24.67443'),
(22,3,'Pintura descascando','Tinta soltando, descascando ou esfarelando da parede','[""descascando"",""soltando"",""esfarelando"",""tinta"",""bolha""]','2026-02-13 18:25:24.67443'),
(23,3,'Parede com rachaduras','Rachaduras ou trincas visíveis na parede que precisam de reparo','[""rachadura"",""trinca"",""fissura"",""parede"",""rachou""]','2026-02-13 18:25:24.67443'),
(24,3,'Infiltração com mancha','Mancha de umidade/amarelada na parede ou teto por infiltração','[""infiltração"",""mancha"",""amarelada"",""úmido"",""teto"",""parede""]','2026-02-13 18:25:24.67443'),
(25,3,'Parede suja/encardida','Parede com aspecto sujo, amarelado pelo tempo ou fumaça','[""suja"",""encardida"",""amarelada"",""escurecida"",""velha""]','2026-02-13 18:25:24.67443'),
(26,3,'Textura danificada','Textura ou grafiato com partes soltas, quebradas ou caindo','[""textura"",""grafiato"",""soltando"",""caindo"",""danificada""]','2026-02-13 18:25:24.67443'),
(27,3,'Fachada/muro deteriorado','Fachada externa ou muro com tinta velha, descascada ou manchada','[""fachada"",""muro"",""externo"",""deteriorado"",""descascado"",""feio""]','2026-02-13 18:25:24.67443'),
(28,3,'Portão/grade enferrujado','Portão ou grade de ferro com ferrugem e pintura deteriorada','[""portão"",""grade"",""ferro"",""ferrugem"",""enferrujado"",""oxidado""]','2026-02-13 18:25:24.67443'),
(29,3,'Teto com manchas','Teto/forro com manchas de infiltração ou pintura velha','[""teto"",""forro"",""mancha"",""infiltração"",""goteira"",""amarelo""]','2026-02-13 18:25:24.67443'),
(30,3,'Quarto/sala precisa repintar','Cômodo que precisa de pintura nova por estar velho ou por mudança de cor','[""pintar"",""repintar"",""quarto"",""sala"",""cor"",""nova"",""renovar""]','2026-02-13 18:25:24.67443'),
(31,4,'Porta não fecha direito','Porta de madeira que não fecha, raspa no chão ou fica solta','[""porta"",""não fecha"",""raspando"",""solta"",""empenada"",""batendo""]','2026-02-13 18:25:24.67443'),
(32,4,'Armário com porta solta','Porta de armário caindo, solta ou com dobradiça quebrada','[""armário"",""porta"",""solta"",""caindo"",""dobradiça"",""quebrada""]','2026-02-13 18:25:24.67443'),
(33,4,'Gaveta travada/quebrada','Gaveta que não abre, não fecha ou tem trilho danificado','[""gaveta"",""travada"",""quebrada"",""trilho"",""não abre"",""presa""]','2026-02-13 18:25:24.67443'),
(34,4,'Piso laminado estufando','Piso laminado com réguas estufadas, soltas ou fazendo barulho','[""piso"",""laminado"",""estufando"",""solto"",""barulho"",""levantando""]','2026-02-13 18:25:24.67443'),
(35,4,'Precisar montar móvel','Móvel novo comprado que precisa de montagem profissional','[""montar"",""montagem"",""móvel"",""novo"",""guarda-roupa"",""estante""]','2026-02-13 18:25:24.67443'),
(36,4,'Prateleira/suporte solto','Prateleira, suporte de TV ou nicho caindo ou solto da parede','[""prateleira"",""suporte"",""solto"",""caindo"",""parede"",""parafuso""]','2026-02-13 18:25:24.67443'),
(37,4,'Rodapé solto/danificado','Rodapé de madeira ou MDF solto, quebrado ou faltando','[""rodapé"",""solto"",""quebrado"",""faltando"",""MDF"",""madeira""]','2026-02-13 18:25:24.67443'),
(38,4,'Janela de madeira com problema','Janela de madeira que não abre, não fecha ou está apodrecendo','[""janela"",""madeira"",""não abre"",""travada"",""podre"",""empenada""]','2026-02-13 18:25:24.67443'),
(39,4,'Piso de madeira rangendo','Taco ou assoalho de madeira fazendo barulho ao pisar','[""piso"",""madeira"",""rangendo"",""barulho"",""taco"",""assoalho"",""rangido""]','2026-02-13 18:25:24.67443'),
(40,4,'Instalar suporte/cortineiro','Precisa instalar suporte de TV, cortineiro, prateleira ou quadro','[""instalar"",""suporte"",""cortineiro"",""TV"",""quadro"",""fixar""]','2026-02-13 18:25:24.67443'),
(41,5,'Ar não gela/não esfria','Ar condicionado ligado mas não esfria o ambiente','[""não gela"",""não esfria"",""quente"",""fraco"",""ar quente""]','2026-02-13 18:25:51.351811'),
(42,5,'Ar pingando água dentro','Unidade interna do ar condicionado gotejando água para dentro do cômodo','[""pingando"",""gotejando"",""água"",""dentro"",""vazando"",""molhando""]','2026-02-13 18:25:51.351811'),
(43,5,'Ar com mau cheiro','Ar condicionado com cheiro forte, mofo ou cheiro desagradável ao ligar','[""cheiro"",""mau cheiro"",""mofo"",""fedendo"",""cheiro ruim""]','2026-02-13 18:25:51.351811'),
(44,5,'Ar fazendo barulho estranho','Ar condicionado com ruído anormal, vibração ou estalos','[""barulho"",""ruído"",""vibração"",""estalo"",""chiado"",""ronco""]','2026-02-13 18:25:51.351811'),
(45,5,'Ar não liga','Ar condicionado que não liga pelo controle ou botão','[""não liga"",""desligado"",""sem resposta"",""controle"",""morto""]','2026-02-13 18:25:51.351811'),
(46,5,'Ar desliga sozinho','Ar condicionado que desliga automaticamente sem motivo aparente','[""desliga"",""sozinho"",""apaga"",""para"",""automático""]','2026-02-13 18:25:51.351811'),
(47,5,'Controle remoto não funciona','Controle remoto do ar não responde ou com funções limitadas','[""controle"",""remoto"",""não funciona"",""pilha"",""não responde""]','2026-02-13 18:25:51.351811'),
(48,5,'Precisa instalar ar split','Necessidade de instalação de ar condicionado split novo','[""instalar"",""instalação"",""ar"",""split"",""novo"",""colocar""]','2026-02-13 18:25:51.351811'),
(49,5,'Ar com gelo na tubulação','Formação de gelo na tubulação ou na unidade interna do ar','[""gelo"",""congelando"",""tubulação"",""geada"",""formando gelo""]','2026-02-13 18:25:51.351811'),
(50,5,'Limpeza de ar condicionado','Ar condicionado precisando de limpeza/higienização periódica','[""limpeza"",""higienização"",""filtro"",""sujo"",""manutenção""]','2026-02-13 18:25:51.351811'),
(51,6,'Faxina residencial completa','Necessidade de limpeza geral da casa/apartamento','[""faxina"",""limpeza"",""geral"",""casa"",""apartamento"",""completa""]','2026-02-13 18:25:51.351811'),
(52,6,'Limpeza pós-obra/reforma','Limpeza pesada após obra ou reforma com resíduos de construção','[""pós-obra"",""reforma"",""construção"",""cimento"",""poeira"",""pesada""]','2026-02-13 18:25:51.351811'),
(53,6,'Sofá/estofado sujo','Sofá ou estofado com manchas, mau cheiro ou precisando higienizar','[""sofá"",""estofado"",""mancha"",""sujo"",""cheiro"",""higienizar""]','2026-02-13 18:25:51.351811'),
(54,6,'Vidros/janelas sujas','Vidros e janelas com sujeira acumulada precisando de lavagem','[""vidros"",""janelas"",""sujas"",""lavagem"",""limpeza"",""transparente""]','2026-02-13 18:25:51.351811'),
(55,6,'Colchão precisando higienizar','Colchão com ácaros, manchas ou precisando de higienização profunda','[""colchão"",""ácaro"",""alergia"",""mancha"",""higienizar"",""limpar""]','2026-02-13 18:25:51.351811'),
(56,6,'Caixa d''água suja','Caixa d''água precisando de limpeza e desinfecção periódica','[""caixa"",""água"",""suja"",""limpeza"",""desinfecção"",""reservatório""]','2026-02-13 18:25:51.351811'),
(57,6,'Piscina precisando limpar','Piscina com água verde, suja ou precisando de tratamento','[""piscina"",""verde"",""suja"",""tratamento"",""limpeza"",""alga""]','2026-02-13 18:25:51.351811'),
(58,6,'Carpete/tapete com manchas','Carpete ou tapete com manchas difíceis ou precisando de lavagem profissional','[""carpete"",""tapete"",""mancha"",""sujo"",""lavagem"",""limpeza""]','2026-02-13 18:25:51.351811'),
(59,6,'Quintal/área externa suja','Quintal com mato, folhas ou sujeira acumulada precisando de limpeza','[""quintal"",""externo"",""mato"",""folhas"",""capina"",""limpeza""]','2026-02-13 18:25:51.351811'),
(60,6,'Calha/rufos entupidos','Calhas e rufos do telhado com folhas e sujeira causando entupimento','[""calha"",""rufo"",""entupida"",""folhas"",""telhado"",""chuva""]','2026-02-13 18:25:51.351811'),
(61,7,'Passar roupas do dia','Roupas do dia a dia acumuladas precisando passar','[""passar"",""roupas"",""dia"",""acumuladas"",""ferro""]','2026-02-13 18:26:28.686306'),
(62,7,'Camisas sociais para evento','Camisas sociais que precisam ficar impecáveis para evento/trabalho','[""camisa"",""social"",""evento"",""trabalho"",""engomar""]','2026-02-13 18:26:28.686306'),
(63,7,'Roupas delicadas/seda','Roupas de tecido delicado que precisam de cuidado especial','[""delicada"",""seda"",""linho"",""cuidado"",""especial""]','2026-02-13 18:26:28.686306'),
(64,7,'Roupa de cama para passar','Lençóis, fronhas e edredons acumulados para passar','[""roupa"",""cama"",""lençol"",""fronha"",""edredom""]','2026-02-13 18:26:28.686306'),
(65,7,'Uniformes escolares','Uniformes escolares em quantidade para passar semanalmente','[""uniforme"",""escolar"",""criança"",""escola"",""semanal""]','2026-02-13 18:26:28.686306'),
(66,7,'Cortinas para passar','Cortinas de tecido que precisam ser passadas após lavagem','[""cortina"",""tecido"",""passar"",""janela"",""lavagem""]','2026-02-13 18:26:28.686306'),
(67,7,'Contratar passadeira fixa','Busca de passadeira para trabalho regular semanal ou mensal','[""contratar"",""fixa"",""semanal"",""mensal"",""regular""]','2026-02-13 18:26:28.686306'),
(68,7,'Roupas de bebê','Roupas de bebê/enxoval que precisam cuidado especial ao passar','[""bebê"",""enxoval"",""roupinha"",""delicado"",""pequeno""]','2026-02-13 18:26:28.686306'),
(69,7,'Toalhas e guardanapos','Toalhas de mesa e guardanapos para evento ou uso doméstico','[""toalha"",""mesa"",""guardanapo"",""evento"",""jantar""]','2026-02-13 18:26:28.686306'),
(70,7,'Jalecos/uniformes profissionais','Jalecos médicos e uniformes profissionais para passar','[""jaleco"",""uniforme"",""profissional"",""médico"",""trabalho""]','2026-02-13 18:26:28.686306'),
(71,8,'Trancado para fora de casa','Pessoa trancada do lado de fora sem chave para entrar','[""trancado"",""fora"",""preso"",""chave"",""não entra"",""porta""]','2026-02-13 18:26:28.686306'),
(72,8,'Chave quebrou na fechadura','Chave que quebrou dentro da fechadura e não sai','[""chave"",""quebrou"",""dentro"",""fechadura"",""presa"",""partiu""]','2026-02-13 18:26:28.686306'),
(73,8,'Fechadura não gira/travou','Fechadura emperrada que não gira ou travou completamente','[""fechadura"",""não gira"",""travou"",""emperrada"",""dura"",""presa""]','2026-02-13 18:26:28.686306'),
(74,8,'Trocar fechadura por segurança','Desejo de trocar fechadura por segurança (mudança, roubo, etc)','[""trocar"",""fechadura"",""segurança"",""mudança"",""roubo"",""nova""]','2026-02-13 18:26:28.686306'),
(75,8,'Precisa de cópia de chave','Necessidade de fazer cópia/duplicata de chave','[""cópia"",""chave"",""duplicata"",""reserva"",""extra"",""fazer""]','2026-02-13 18:26:28.686306'),
(76,8,'Instalar fechadura digital','Desejo de instalar fechadura eletrônica com senha ou biometria','[""digital"",""eletrônica"",""biometria"",""senha"",""instalar""]','2026-02-13 18:26:28.686306'),
(77,8,'Porta do carro trancada','Chave trancada dentro do carro ou porta travada','[""carro"",""trancado"",""chave dentro"",""veículo"",""porta""]','2026-02-13 18:26:28.686306'),
(78,8,'Cadeado/cofre trancado','Cadeado sem chave ou cofre que não abre','[""cadeado"",""cofre"",""trancado"",""sem chave"",""não abre""]','2026-02-13 18:26:28.686306'),
(79,8,'Fechadura da porta não tranca','Fechadura que não tranca mais, lingueta não entra ou fica solta','[""não tranca"",""solta"",""lingueta"",""inseguro"",""porta""]','2026-02-13 18:26:28.686306'),
(80,8,'Chave não copia na máquina','Chave especial que precisa de cópia profissional','[""chave"",""especial"",""tetra"",""codificada"",""cópia"",""transponder""]','2026-02-13 18:26:28.686306'),
(81,9,'Portão não abre','Portão automático que não abre pelo controle nem pelo botão','[""portão"",""não abre"",""travado"",""motor"",""parado""]','2026-02-13 18:26:28.686306'),
(82,9,'Portão não fecha completamente','Portão que abre mas não fecha todo ou para no meio','[""portão"",""não fecha"",""para"",""meio"",""incompleto""]','2026-02-13 18:26:28.686306'),
(83,9,'Motor do portão fazendo barulho','Motor do portão com ruído anormal, ronco ou chiado','[""motor"",""barulho"",""ronco"",""chiado"",""portão"",""ruído""]','2026-02-13 18:26:28.686306'),
(84,9,'Controle do portão não funciona','Controle remoto que não abre/fecha o portão','[""controle"",""remoto"",""não funciona"",""portão"",""pilha""]','2026-02-13 18:26:28.686306'),
(85,9,'Portão caiu/saiu do trilho','Portão deslizante que saiu do trilho ou basculante que caiu','[""caiu"",""trilho"",""saiu"",""portão"",""deslizante"",""descarrilou""]','2026-02-13 18:26:28.686306'),
(86,9,'Portão rangendo/chiando','Portão fazendo barulho de metal ao abrir ou fechar','[""rangendo"",""chiando"",""barulho"",""metal"",""lubrificar""]','2026-02-13 18:26:28.686306'),
(87,9,'Quero motorizar meu portão','Portão manual que deseja automatizar com motor','[""motorizar"",""automatizar"",""motor"",""novo"",""instalar"",""manual""]','2026-02-13 18:26:28.686306'),
(88,9,'Portão basculante pesado/difícil','Portão basculante pesado para levantar ou que não segura aberto','[""basculante"",""pesado"",""difícil"",""mola"",""cabo"",""não segura""]','2026-02-13 18:26:28.686306'),
(89,9,'Portão com ferrugem','Portão de ferro com pontos de ferrugem e deterioração','[""ferrugem"",""enferrujado"",""oxidado"",""portão"",""ferro""]','2026-02-13 18:26:28.686306'),
(90,9,'Interfone/vídeo porteiro com problema','Interfone que não funciona ou vídeo porteiro com defeito','[""interfone"",""vídeo porteiro"",""não funciona"",""não ouve"",""sem imagem""]','2026-02-13 18:26:28.686306')"
  ON CONFLICT (id) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    keywords = EXCLUDED.keywords;

  SELECT setval('symptoms_id_seq', (SELECT MAX(id) FROM symptoms));

  -- 6. SYMPTOM QUESTIONS (upsert)
  INSERT INTO symptom_questions (id, symptom_id, question, expected_responses, display_order, created_at, trigger_keywords) VALUES
  LINE 3: ...ALESCE(expected_responses,'')) || ',' || COALESCE(display_or...
                                                             ^
  ON CONFLICT (id) DO UPDATE SET
    symptom_id = EXCLUDED.symptom_id,
    question = EXCLUDED.question,
    expected_responses = EXCLUDED.expected_responses,
    display_order = EXCLUDED.display_order,
    trigger_keywords = EXCLUDED.trigger_keywords;

  SELECT setval('symptom_questions_id_seq', (SELECT MAX(id) FROM symptom_questions));

  -- 7. SYMPTOM DIAGNOSES (upsert)
  INSERT INTO symptom_diagnoses (id, symptom_id, diagnosis_name, description, estimated_price_min, estimated_price_max, materials, urgency_level, created_at) VALUES
  LINE 3: ...,' || symptom_id || ',' || quote_literal(COALESCE(diagnosis_...
                                                             ^
  ON CONFLICT (id) DO UPDATE SET
    symptom_id = EXCLUDED.symptom_id,
    diagnosis_name = EXCLUDED.diagnosis_name,
    description = EXCLUDED.description,
    estimated_price_min = EXCLUDED.estimated_price_min,
    estimated_price_max = EXCLUDED.estimated_price_max,
    materials = EXCLUDED.materials,
    urgency_level = EXCLUDED.urgency_level;

  SELECT setval('symptom_diagnoses_id_seq', (SELECT MAX(id) FROM symptom_diagnoses));

  -- 8. LOCAL KNOWLEDGE (upsert)
  INSERT INTO local_knowledge (id, city, category, info_type, content, created_at) VALUES
  LINE 3: ...te_literal(city) || ',' || quote_literal(COALESCE(category,'...
                                                             ^
HINT:  Perhaps you meant to reference the column "local_knowledge.category_id".
  ON CONFLICT (id) DO UPDATE SET
    city = EXCLUDED.city,
    category = EXCLUDED.category,
    info_type = EXCLUDED.info_type,
    content = EXCLUDED.content;

  SELECT setval('local_knowledge_id_seq', (SELECT MAX(id) FROM local_knowledge));

  COMMIT;

  -- Verification queries
  SELECT 'users' as table_name, count(*) as count FROM users
  UNION ALL SELECT 'user_profiles', count(*) FROM user_profiles
  UNION ALL SELECT 'service_categories', count(*) FROM service_categories
  UNION ALL SELECT 'provider_availability', count(*) FROM provider_availability
  UNION ALL SELECT 'symptoms', count(*) FROM symptoms
  UNION ALL SELECT 'symptom_questions', count(*) FROM symptom_questions
  UNION ALL SELECT 'symptom_diagnoses', count(*) FROM symptom_diagnoses
  UNION ALL SELECT 'local_knowledge', count(*) FROM local_knowledge;
  