import { useState } from "react";
import { SiteConfig, getTemplateById, DEFAULT_SITE_SECTIONS } from "@/lib/siteTemplates";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Phone, Mail, MapPin, MessageCircle, Star, ChevronDown, Check,
  Stethoscope, ShieldCheck, Clock, Award, Scale, BookOpen, Trophy, Users,
  Calendar, GraduationCap, Briefcase, Sparkles, Instagram, Facebook, Youtube, Linkedin, ExternalLink, Image as ImageIcon, PlayCircle
} from "lucide-react";
import { ChatCaptureWidget } from "./ChatCaptureWidget";
import { WhatsAppFloating } from "./WhatsAppFloating";
import { AnimatedSection } from "./AnimatedSection";
import { StatsCounter } from "./StatsCounter";
import { AgendamentoModal } from "./AgendamentoModal";
import { Link } from "react-router-dom";

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Stethoscope, ShieldCheck, Clock, Award, Scale, BookOpen, Trophy, Users,
  Calendar, GraduationCap, Briefcase, Sparkles, Star, Check,
};

interface FullConfig extends SiteConfig {
  titulo?: string;
  cor_primaria?: string;
  cor_secundaria?: string;
  logo_url?: string;
  whatsapp?: string;
  telefone_contato?: string;
  email_contato?: string;
  endereco?: string;
  servicos?: Array<{ nome: string; descricao?: string; imagem_url?: string; icone?: string }>;
  depoimentos?: Array<{ nome: string; texto: string; estrelas?: number; foto_url?: string; cargo?: string }>;
  faq?: Array<{ pergunta: string; resposta: string }>;
  perguntas?: Array<{ campo: string; label: string; tipo?: string; obrigatorio?: boolean }>;
  tag_automatica?: string;
  sugestoes_chat?: string[];
}

interface Props {
  config: FullConfig;
  companyId: string;
  companyName: string;
  slug: string;
  previewMode?: boolean;
}

export function SiteRenderer({ config, companyId, companyName, slug, previewMode }: Props) {
  const template = getTemplateById(config.site_template);
  const theme = config.site_theme || template?.theme || { primary: config.cor_primaria || '#0EA5E9', secondary: config.cor_secundaria || '#0369A1' };
  const sections = config.site_sections?.length ? config.site_sections : DEFAULT_SITE_SECTIONS;
  const enabled = (key: string) => sections.find((s) => s.key === key)?.enabled !== false;
  const isLanding = config.site_layout === 'landing_pessoal' || theme.layout === 'landing_pessoal';

  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [agendaOpen, setAgendaOpen] = useState(false);
  const agendamentoAtivo = config.agendamento_ativo !== false; // ativo por padrão

  const primary = theme.primary;
  const secondary = theme.secondary;
  const accent = theme.accent || theme.primary;

  const fontClass =
    theme.font === 'playfair' ? 'font-serif' :
    theme.font === 'poppins' ? 'font-sans' :
    theme.font === 'roboto' ? 'font-sans' : 'font-sans';

  const isPremium = theme.style === 'premium';

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const navItems = sections.filter((s) => s.enabled && s.key !== 'hero');
  const especialistaName = config.especialista_nome || companyName;

  const renderIcon = (name?: string, className = 'w-6 h-6') => {
    const Icon = (name && ICON_MAP[name]) || Sparkles;
    return <Icon className={className} />;
  };

  return (
    <div className={`min-h-screen bg-white text-slate-900 ${fontClass}`}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {config.logo_url ? (
              <img src={config.logo_url} alt={companyName} className="h-10 w-auto" />
            ) : (
              <div className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ background: primary }}>
                {(isLanding ? especialistaName : companyName).charAt(0)}
              </div>
            )}
            <span className="font-bold text-lg">{isLanding ? especialistaName : companyName}</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            {navItems.map((s) => (
              <button key={s.key} onClick={() => scrollTo(s.key)} className="hover:opacity-70 transition story-link">
                {s.title}
              </button>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-2">
            {agendamentoAtivo && (
              <Button size="sm" variant="outline" onClick={() => setAgendaOpen(true)}>
                <Calendar className="w-4 h-4 mr-1" /> Agendar
              </Button>
            )}
            {config.whatsapp && (
              <Button asChild size="sm" style={{ background: primary }}>
                <a href={`https://wa.me/${config.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                  <MessageCircle className="w-4 h-4 mr-1" /> {isLanding ? 'Falar' : 'Falar agora'}
                </a>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      {enabled('hero') && (
        <section
          id="hero"
          className="relative overflow-hidden"
          style={isPremium
            ? { background: `radial-gradient(ellipse at top right, ${primary}22, transparent 60%), radial-gradient(ellipse at bottom left, ${secondary}33, transparent 60%), #0a0e1a` }
            : { background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)` }}
        >
          <div className={`absolute inset-0 ${isPremium ? 'opacity-20' : 'opacity-10'}`}
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />

          <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-32 grid md:grid-cols-2 gap-10 items-center text-white">
            <div className="space-y-6 animate-fade-in">
              {config.hero_badge && (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-sm font-medium">
                  <Sparkles className="w-3.5 h-3.5" /> {config.hero_badge}
                </div>
              )}
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                {config.hero_titulo || `Bem-vindo${isLanding ? '' : ` à ${companyName}`}`}
              </h1>
              <p className="text-lg md:text-xl opacity-90 max-w-xl">
                {config.hero_subtitulo || 'Soluções profissionais de excelência'}
              </p>
              {isLanding && config.especialista_titulo && (
                <div className="text-sm opacity-80">
                  <strong>{especialistaName}</strong> · {config.especialista_titulo}
                  {config.especialista_registro && <span> · {config.especialista_registro}</span>}
                </div>
              )}
              <div className="flex gap-3 flex-wrap">
                <Button size="lg" onClick={() => agendamentoAtivo ? setAgendaOpen(true) : setChatOpen(true)} className="bg-white text-slate-900 hover:bg-slate-100 shadow-xl hover-scale">
                  <Calendar className="w-4 h-4 mr-2" />
                  {config.hero_cta_texto || (isLanding ? 'Agendar agora' : 'Agendar consulta')}
                </Button>
                <Button size="lg" variant="outline" onClick={() => setChatOpen(true)} className="border-white text-white hover:bg-white/10 bg-transparent">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  {config.hero_cta_secundario || 'Falar com a IA'}
                </Button>
              </div>
            </div>
            {(isLanding ? config.especialista_foto_url : config.hero_imagem_url) && (
              <div className="animate-scale-in">
                <div className="relative">
                  <div className="absolute inset-0 rounded-3xl blur-3xl opacity-30" style={{ background: accent }} />
                  <img
                    src={isLanding ? config.especialista_foto_url : config.hero_imagem_url}
                    alt="Hero"
                    className={`relative rounded-3xl shadow-2xl w-full ${isLanding ? 'aspect-[4/5] object-cover' : ''}`}
                  />
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ESTATÍSTICAS / Contadores */}
      {enabled('estatisticas') && config.estatisticas && config.estatisticas.length > 0 && (
        <AnimatedSection className="py-12 md:py-16 bg-white border-b">
          <div className="max-w-7xl mx-auto px-4">
            <StatsCounter estatisticas={config.estatisticas} primary={primary} />
          </div>
        </AnimatedSection>
      )}

      {/* SOBRE */}
      {enabled('sobre') && (
        <AnimatedSection id="sobre" className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-10 items-center">
            {(isLanding ? config.especialista_foto_url : config.sobre_imagem_url) && (
              <div className="relative">
                <div className="absolute -inset-4 rounded-3xl blur-2xl opacity-20" style={{ background: primary }} />
                <img src={isLanding ? config.especialista_foto_url : config.sobre_imagem_url} alt="Sobre" className="relative rounded-2xl shadow-xl w-full aspect-[4/5] object-cover" />
              </div>
            )}
            <div>
              <div className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: accent }}>
                {isLanding ? 'Sobre mim' : 'Sobre nós'}
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: primary }}>
                {isLanding ? especialistaName : (config.sobre_titulo || 'Sobre nós')}
              </h2>
              {isLanding && config.especialista_titulo && (
                <p className="text-lg font-medium text-slate-700 mb-4">
                  {config.especialista_titulo}
                  {config.especialista_registro && <span className="text-slate-500"> · {config.especialista_registro}</span>}
                </p>
              )}
              <p className="text-slate-600 text-lg mb-6 leading-relaxed">
                {isLanding ? config.especialista_bio : config.sobre_texto}
              </p>

              {isLanding && config.especialista_formacao && config.especialista_formacao.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold mb-3 flex items-center gap-2"><GraduationCap className="w-5 h-5" style={{ color: primary }} /> Formação</h3>
                  <ul className="space-y-2">
                    {config.especialista_formacao.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-slate-600 text-sm">
                        <Check className="w-4 h-4 mt-1 shrink-0" style={{ color: primary }} />{f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!isLanding && (config.sobre_missao || config.sobre_visao) && (
                <div className="grid sm:grid-cols-2 gap-4 mb-6">
                  {config.sobre_missao && (
                    <Card className="p-5">
                      <h3 className="font-bold mb-2" style={{ color: primary }}>Missão</h3>
                      <p className="text-sm text-slate-600">{config.sobre_missao}</p>
                    </Card>
                  )}
                  {config.sobre_visao && (
                    <Card className="p-5">
                      <h3 className="font-bold mb-2" style={{ color: primary }}>Visão</h3>
                      <p className="text-sm text-slate-600">{config.sobre_visao}</p>
                    </Card>
                  )}
                </div>
              )}
              {!isLanding && config.sobre_valores && config.sobre_valores.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {config.sobre_valores.map((v, i) => (
                    <span key={i} className="px-4 py-2 rounded-full text-sm font-medium text-white" style={{ background: accent }}>{v}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </AnimatedSection>
      )}

      {/* DIFERENCIAIS */}
      {enabled('diferenciais') && config.diferenciais && config.diferenciais.length > 0 && (
        <AnimatedSection id="diferenciais" className="py-16 md:py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <div className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: accent }}>Por que escolher</div>
              <h2 className="text-3xl md:text-4xl font-bold" style={{ color: primary }}>Nossos diferenciais</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {config.diferenciais.map((d, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl transition-shadow border">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white mb-4" style={{ background: primary }}>
                    {renderIcon(d.icone)}
                  </div>
                  <h3 className="font-bold mb-2">{d.titulo}</h3>
                  <p className="text-sm text-slate-600">{d.descricao}</p>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      )}

      {/* SERVIÇOS / ESPECIALIDADES */}
      {enabled('servicos') && (
        (isLanding && config.especialista_especialidades?.length) || (config.servicos && config.servicos.length > 0)
      ) && (
        <AnimatedSection id="servicos" className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <div className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: accent }}>
                {isLanding ? 'O que ofereço' : 'O que fazemos'}
              </div>
              <h2 className="text-3xl md:text-4xl font-bold" style={{ color: primary }}>
                {isLanding ? 'Especialidades' : 'Nossos Serviços'}
              </h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLanding && !config.servicos?.length
                ? config.especialista_especialidades?.map((esp, i) => (
                    <Card key={i} className="p-6 hover:shadow-xl transition-all hover:-translate-y-1 group">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform" style={{ background: primary }}>
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-lg" style={{ color: primary }}>{esp}</h3>
                    </Card>
                  ))
                : config.servicos?.map((s, i) => (
                    <Card key={i} className="p-6 hover:shadow-xl transition-all hover:-translate-y-1 group">
                      {s.imagem_url ? (
                        <img src={s.imagem_url} alt={s.nome} className="w-full h-40 object-cover rounded-lg mb-4" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform" style={{ background: primary }}>
                          {renderIcon(s.icone)}
                        </div>
                      )}
                      <h3 className="font-bold text-xl mb-2" style={{ color: primary }}>{s.nome}</h3>
                      <p className="text-slate-600 text-sm">{s.descricao}</p>
                    </Card>
                  ))}
            </div>
          </div>
        </AnimatedSection>
      )}

      {/* EQUIPE */}
      {enabled('equipe') && !isLanding && config.equipe && config.equipe.length > 0 && (
        <AnimatedSection id="equipe" className="py-16 md:py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <div className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: accent }}>Nosso time</div>
              <h2 className="text-3xl md:text-4xl font-bold" style={{ color: primary }}>Conheça a equipe</h2>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {config.equipe.map((m, i) => (
                <Card key={i} className="p-6 text-center hover:shadow-xl transition">
                  {m.foto_url ? (
                    <img src={m.foto_url} alt={m.nome} className="w-28 h-28 mx-auto rounded-full object-cover mb-4 ring-4 ring-white shadow-lg" />
                  ) : (
                    <div className="w-28 h-28 mx-auto rounded-full mb-4 flex items-center justify-center text-white text-3xl font-bold" style={{ background: primary }}>
                      {m.nome.charAt(0)}
                    </div>
                  )}
                  <h3 className="font-bold">{m.nome}</h3>
                  <p className="text-sm font-medium" style={{ color: primary }}>{m.cargo}</p>
                  {m.registro && <p className="text-xs text-slate-500">{m.registro}</p>}
                  {m.bio && <p className="text-xs text-slate-500 mt-2 line-clamp-3">{m.bio}</p>}
                </Card>
              ))}
            </div>
          </div>
        </AnimatedSection>
      )}

      {/* GALERIA */}
      {enabled('galeria') && config.galeria && config.galeria.length > 0 && (
        <AnimatedSection id="galeria" className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12" style={{ color: primary }}>Galeria</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {config.galeria.map((img, i) => (
                <img key={i} src={img} alt={`Galeria ${i + 1}`} className="w-full aspect-square object-cover rounded-lg hover:scale-105 transition cursor-pointer" />
              ))}
            </div>
          </div>
        </AnimatedSection>
      )}

      {/* DEPOIMENTOS */}
      {enabled('depoimentos') && config.depoimentos && config.depoimentos.length > 0 && (
        <AnimatedSection id="depoimentos" className="py-16 md:py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <div className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: accent }}>Depoimentos</div>
              <h2 className="text-3xl md:text-4xl font-bold" style={{ color: primary }}>O que dizem sobre nós</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {config.depoimentos.map((d, i) => (
                <Card key={i} className="p-6 hover:shadow-xl transition">
                  <div className="flex gap-1 mb-3">
                    {Array.from({ length: d.estrelas || 5 }).map((_, idx) => (
                      <Star key={idx} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-slate-600 italic mb-4">"{d.texto}"</p>
                  <div className="flex items-center gap-3 pt-3 border-t">
                    {d.foto_url ? (
                      <img src={d.foto_url} alt={d.nome} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: primary }}>
                        {d.nome.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-sm">{d.nome}</div>
                      {d.cargo && <div className="text-xs text-slate-500">{d.cargo}</div>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </AnimatedSection>
      )}

      {/* PLANOS */}
      {enabled('planos') && config.planos && config.planos.length > 0 && (
        <AnimatedSection id="planos" className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <div className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: accent }}>Investimento</div>
              <h2 className="text-3xl md:text-4xl font-bold" style={{ color: primary }}>Planos & Preços</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {config.planos.map((p, i) => (
                <Card key={i} className={`p-8 transition hover:shadow-2xl ${p.destaque ? 'ring-2 md:scale-105 shadow-xl' : ''}`} style={p.destaque ? { borderColor: primary } : {}}>
                  {p.destaque && (
                    <div className="text-xs font-bold text-white px-3 py-1 rounded-full inline-block mb-3" style={{ background: primary }}>MAIS POPULAR</div>
                  )}
                  <h3 className="font-bold text-xl mb-1">{p.nome}</h3>
                  {p.descricao && <p className="text-sm text-slate-500 mb-4">{p.descricao}</p>}
                  <div className="mb-6">
                    <span className="text-4xl font-bold" style={{ color: primary }}>{p.preco}</span>
                    {p.periodo && <span className="text-slate-500">/{p.periodo}</span>}
                  </div>
                  <ul className="space-y-2 mb-6">
                    {p.itens.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: primary }} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" style={{ background: primary }} onClick={() => setChatOpen(true)}>
                    {p.cta_texto || 'Contratar'}
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        </AnimatedSection>
      )}

      {/* BLOG */}
      {enabled('blog') && config.blog_posts && config.blog_posts.length > 0 && (
        <AnimatedSection id="blog" className="py-16 md:py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12" style={{ color: primary }}>Blog & Notícias</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {config.blog_posts.map((post, i) => (
                <Card key={i} className="overflow-hidden hover:shadow-xl transition group cursor-pointer">
                  {post.imagem_url && <img src={post.imagem_url} alt={post.titulo} className="w-full h-48 object-cover group-hover:scale-105 transition" />}
                  <div className="p-5">
                    <h3 className="font-bold mb-2 line-clamp-2">{post.titulo}</h3>
                    <p className="text-sm text-slate-600 mb-3 line-clamp-3">{post.resumo}</p>
                    <div className="text-xs text-slate-400">{post.autor} · {post.data}</div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </AnimatedSection>
      )}

      {/* FAQ */}
      {enabled('faq') && config.faq && config.faq.length > 0 && (
        <AnimatedSection id="faq" className="py-16 md:py-24">
          <div className="max-w-3xl mx-auto px-4">
            <div className="text-center mb-12">
              <div className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: accent }}>Dúvidas</div>
              <h2 className="text-3xl md:text-4xl font-bold" style={{ color: primary }}>Perguntas Frequentes</h2>
            </div>
            <div className="space-y-3">
              {config.faq.map((f, i) => (
                <Card key={i} className="overflow-hidden">
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-50">
                    <span className="font-medium">{f.pergunta}</span>
                    <ChevronDown className={`w-5 h-5 transition ${openFaq === i ? 'rotate-180' : ''}`} style={{ color: primary }} />
                  </button>
                  {openFaq === i && <div className="px-5 pb-5 text-slate-600 text-sm animate-fade-in">{f.resposta}</div>}
                </Card>
              ))}
            </div>
          </div>
        </AnimatedSection>
      )}

      {/* REDES SOCIAIS */}
      {enabled('social') && (config.instagram_url || config.facebook_url || config.youtube_url || config.tiktok_url || config.linkedin_url || (config.instagram_posts && config.instagram_posts.length > 0)) && (
        <AnimatedSection id="social" className="py-16 md:py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <div className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: accent }}>Siga nas redes</div>
              <h2 className="text-3xl md:text-4xl font-bold" style={{ color: primary }}>Acompanhe nosso dia a dia</h2>
              {config.instagram_username && (
                <p className="text-slate-600 mt-2">@{config.instagram_username}</p>
              )}
            </div>

            {/* Ícones sociais */}
            <div className="flex justify-center gap-3 mb-10 flex-wrap">
              {config.instagram_url && (
                <a href={config.instagram_url} target="_blank" rel="noreferrer" className="w-14 h-14 rounded-full flex items-center justify-center text-white hover:scale-110 transition shadow-lg" style={{ background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}>
                  <Instagram className="w-6 h-6" />
                </a>
              )}
              {config.facebook_url && (
                <a href={config.facebook_url} target="_blank" rel="noreferrer" className="w-14 h-14 rounded-full flex items-center justify-center text-white hover:scale-110 transition shadow-lg bg-[#1877F2]">
                  <Facebook className="w-6 h-6" />
                </a>
              )}
              {config.youtube_url && (
                <a href={config.youtube_url} target="_blank" rel="noreferrer" className="w-14 h-14 rounded-full flex items-center justify-center text-white hover:scale-110 transition shadow-lg bg-[#FF0000]">
                  <Youtube className="w-6 h-6" />
                </a>
              )}
              {config.linkedin_url && (
                <a href={config.linkedin_url} target="_blank" rel="noreferrer" className="w-14 h-14 rounded-full flex items-center justify-center text-white hover:scale-110 transition shadow-lg bg-[#0A66C2]">
                  <Linkedin className="w-6 h-6" />
                </a>
              )}
              {config.tiktok_url && (
                <a href={config.tiktok_url} target="_blank" rel="noreferrer" className="w-14 h-14 rounded-full flex items-center justify-center text-white hover:scale-110 transition shadow-lg bg-black">
                  <PlayCircle className="w-6 h-6" />
                </a>
              )}
            </div>

            {/* Feed Instagram (posts manuais) */}
            {config.instagram_posts && config.instagram_posts.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {config.instagram_posts.slice(0, 8).map((p, i) => (
                  <a key={i} href={p.link || config.instagram_url || '#'} target="_blank" rel="noreferrer" className="relative group aspect-square overflow-hidden rounded-xl bg-slate-200">
                    <img src={p.imagem_url} alt={p.legenda || `Post ${i + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Instagram className="w-8 h-8 text-white" />
                    </div>
                    {p.tipo === 'reel' && (
                      <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">Reel</div>
                    )}
                  </a>
                ))}
              </div>
            )}

            {/* Embed Facebook page */}
            {config.facebook_embed_ativo && config.facebook_url && (
              <div className="mt-10 flex justify-center">
                <iframe
                  src={`https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(config.facebook_url)}&tabs=timeline&width=500&height=500&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true`}
                  width="500" height="500" style={{ border: 'none', overflow: 'hidden', maxWidth: '100%' }}
                  scrolling="no" frameBorder={0} allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                />
              </div>
            )}
          </div>
        </AnimatedSection>
      )}

      {/* LOCALIZAÇÃO + GOOGLE REVIEWS */}
      {enabled('localizacao') && (config.google_maps_embed_url || config.google_place_id || config.endereco_completo || config.endereco || (config.google_reviews && config.google_reviews.length > 0)) && (
        <AnimatedSection id="localizacao" className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <div className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: accent }}>Onde estamos</div>
              <h2 className="text-3xl md:text-4xl font-bold" style={{ color: primary }}>Localização & Avaliações</h2>
              {(config.google_rating || config.google_reviews_total) && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-5 h-5 ${i < Math.round(config.google_rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`} />
                    ))}
                  </div>
                  <span className="font-bold text-lg">{config.google_rating?.toFixed(1)}</span>
                  {config.google_reviews_total && (
                    <span className="text-slate-500 text-sm">({config.google_reviews_total} avaliações no Google)</span>
                  )}
                </div>
              )}
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Mapa */}
              <div>
                {(config.google_maps_embed_url || config.google_place_id) && (
                  <div className="rounded-2xl overflow-hidden shadow-lg aspect-square lg:aspect-auto lg:h-full min-h-[400px]">
                    <iframe
                      src={config.google_maps_embed_url || `https://www.google.com/maps/embed/v1/place?key=&q=place_id:${config.google_place_id}`}
                      width="100%" height="100%" style={{ border: 0, minHeight: 400 }}
                      allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                )}
                {(config.endereco_completo || config.endereco) && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-xl flex items-start gap-3">
                    <MapPin className="w-5 h-5 mt-0.5 shrink-0" style={{ color: primary }} />
                    <div className="flex-1">
                      <p className="text-slate-700 text-sm">{config.endereco_completo || config.endereco}</p>
                      {(config.google_maps_link || config.google_place_id) && (
                        <a href={config.google_maps_link || `https://www.google.com/maps/place/?q=place_id:${config.google_place_id}`} target="_blank" rel="noreferrer" className="text-xs font-medium mt-1 inline-flex items-center gap-1 hover:underline" style={{ color: primary }}>
                          Ver no Google Maps <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Reviews Google */}
              {config.google_reviews && config.google_reviews.length > 0 && (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  <div className="flex items-center gap-2 mb-2">
                    <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    <span className="font-semibold">Avaliações do Google</span>
                  </div>
                  {config.google_reviews.map((r, i) => (
                    <Card key={i} className="p-5 hover:shadow-md transition">
                      <div className="flex items-start gap-3">
                        {r.foto_autor ? (
                          <img src={r.foto_autor} alt={r.autor} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: primary }}>
                            {r.autor.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-sm">{r.autor}</span>
                            {r.data && <span className="text-xs text-slate-400">{r.data}</span>}
                          </div>
                          <div className="flex gap-0.5 my-1">
                            {Array.from({ length: 5 }).map((_, idx) => (
                              <Star key={idx} className={`w-3.5 h-3.5 ${idx < r.estrelas ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`} />
                            ))}
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed">{r.texto}</p>
                          {r.fotos && r.fotos.length > 0 && (
                            <div className="flex gap-2 mt-3 flex-wrap">
                              {r.fotos.map((f, fi) => (
                                <img key={fi} src={f} alt="" className="w-16 h-16 rounded-lg object-cover" />
                              ))}
                            </div>
                          )}
                          {r.video_url && (
                            <a href={r.video_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium" style={{ color: primary }}>
                              <PlayCircle className="w-4 h-4" /> Ver vídeo
                            </a>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </AnimatedSection>
      )}

      {enabled('contato') && (
        <AnimatedSection id="contato" className="py-16 md:py-24" style={{ background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`, color: 'white' }}>
          <div className="max-w-5xl mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {isLanding ? 'Vamos conversar?' : 'Entre em contato'}
            </h2>
            <p className="text-lg opacity-90 mb-10">
              {isLanding ? 'Estou pronto para te atender' : 'Estamos prontos para atender você'}
            </p>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 text-left">
              {config.whatsapp && (
                <a href={`https://wa.me/${config.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 hover:opacity-80 transition">
                  <MessageCircle className="w-8 h-8" />
                  <span className="text-sm font-medium">WhatsApp</span>
                  <span className="text-xs opacity-80">{config.whatsapp}</span>
                </a>
              )}
              {config.telefone_contato && (
                <a href={`tel:${config.telefone_contato}`} className="flex flex-col items-center gap-2 hover:opacity-80 transition">
                  <Phone className="w-8 h-8" />
                  <span className="text-sm font-medium">Telefone</span>
                  <span className="text-xs opacity-80">{config.telefone_contato}</span>
                </a>
              )}
              {config.email_contato && (
                <a href={`mailto:${config.email_contato}`} className="flex flex-col items-center gap-2 hover:opacity-80 transition">
                  <Mail className="w-8 h-8" />
                  <span className="text-sm font-medium">E-mail</span>
                  <span className="text-xs opacity-80 break-all">{config.email_contato}</span>
                </a>
              )}
              {config.endereco && (
                <div className="flex flex-col items-center gap-2">
                  <MapPin className="w-8 h-8" />
                  <span className="text-sm font-medium">Endereço</span>
                  <span className="text-xs opacity-80 text-center">{config.endereco}</span>
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-center flex-wrap mt-10">
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setChatOpen(true)}>
                <MessageCircle className="w-4 h-4 mr-2" /> Iniciar conversa
              </Button>
              {agendamentoAtivo && (
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 bg-transparent" onClick={() => setAgendaOpen(true)}>
                  <Calendar className="w-4 h-4 mr-2" /> Agendar horário
                </Button>
              )}
            </div>
          </div>
        </AnimatedSection>
      )}

      {/* Footer */}
      <footer className="py-8 bg-slate-900 text-slate-400 text-center text-sm">
        <div>© {new Date().getFullYear()} {isLanding ? especialistaName : companyName}. Todos os direitos reservados.</div>
        <div className="text-xs mt-2 opacity-60">Site criado com Waze CRM</div>
        {previewMode && <div className="text-xs mt-2 opacity-70">[Modo Preview]</div>}
      </footer>

      {/* WhatsApp flutuante */}
      {!previewMode && config.whatsapp_flutuante_ativo && config.whatsapp && (
        <WhatsAppFloating
          whatsapp={config.whatsapp}
          mensagem={config.whatsapp_flutuante_mensagem}
          empresa={isLanding ? especialistaName : companyName}
        />
      )}

      {/* Chat widget de captura (formulário inline) */}
      {!previewMode && (
        <ChatCaptureWidget
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          companyId={companyId}
          companyName={isLanding ? especialistaName : companyName}
          config={{ ...(config as any), company_slug: slug }}
          theme={theme}
        />
      )}

      {/* Modal de Agendamento (popup no site inteiro) */}
      {!previewMode && agendamentoAtivo && (
        <AgendamentoModal
          open={agendaOpen}
          onClose={() => setAgendaOpen(false)}
          slug={slug}
          companyName={isLanding ? especialistaName : companyName}
          primary={primary}
        />
      )}
    </div>
  );
}
