import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Logo from '@/components/brand/Logo';

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen w-full flex-col">
      {/* TopNavBar */}
      <header className="sticky top-0 z-50 flex items-center justify-center border-b border-gray-200/50 dark:border-white/10 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm">
        <nav className="flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Logo href="/" size="md" />
          <div className="hidden items-center gap-8 md:flex">
            <a className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors" href="#features">
              Özellikler
            </a>
            <a className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors" href="#pricing">
              Fiyatlandırma
            </a>
            <a className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors" href="#about">
              Hakkımızda
            </a>
          </div>
          <Link href="/login">
                  <button className="button button-egg-blue">
                    Giriş Yap
                  </button>
                </Link>
        </nav>
      </header>

      <main className="flex-grow">
        {/* HeroSection */}
        <section className="w-full py-20 lg:py-32 relative overflow-hidden">
          {/* Background pattern - subtle wavy lines */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]">
            <svg className="absolute bottom-0 left-0 w-full h-full" viewBox="0 0 1200 600" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0,300 Q300,200 600,300 T1200,300" stroke="currentColor" strokeWidth="2" className="text-color-primary"/>
              <path d="M0,350 Q300,250 600,350 T1200,350" stroke="currentColor" strokeWidth="2" className="text-color-primary"/>
              <path d="M0,400 Q300,300 600,400 T1200,400" stroke="currentColor" strokeWidth="2" className="text-color-primary"/>
              <path d="M0,250 Q300,150 600,250 T1200,250" stroke="currentColor" strokeWidth="2" className="text-color-primary"/>
            </svg>
          </div>
          <div className="container mx-auto max-w-4xl px-6 relative z-10">
            <div className="flex flex-col items-center justify-center text-center gap-6">
              {/* Small title */}
              <h3 className="text-lg sm:text-xl md:text-2xl font-normal text-gray-900 dark:text-white font-display">
                Yasal Sözleşmelerinizi Devrimleştirin
              </h3>
              
              {/* Main title */}
              <h5 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white font-display leading-tight">
                <span style={{ color: 'rgb(254, 76, 60)' }}>AI Destekli</span> Sözleşme
                <br />
                Yönetimi.
              </h5>
              
              {/* Description */}
              <div className="block px-3 text-center">
                <div className="card-body">
                  <p className="text">
                    Yasal sözleşmelerden kaynaklanan zorlukları ortadan kaldırın ve AI destekli çözümümüzle sorunsuz yönetimin keyfini çıkarın.
                  </p>
                </div>
              </div>
              
              {/* Buttons */}
              <div className="hidden lg:flex items-center justify-center gap-3">
                <Link href="/register">
                  <button className="button button-red me-3">
                    Kayıt Ol
                  </button>
                </Link>
                <Link href="/login">
                  <button className="button button-egg-blue">
                    Giriş Yap
                  </button>
                </Link>
              </div>
              
              {/* Mobile buttons */}
              <div className="flex lg:hidden flex-col items-center justify-center gap-4 w-full sm:flex-row">
                <Link href="/register" className="w-full sm:w-auto">
                  <button className="button button-red w-full sm:w-auto me-3">
                    Kayıt Ol
                  </button>
                </Link>
                <Link href="/login" className="w-full sm:w-auto">
                  <button className="button button-egg-blue w-full sm:w-auto">
                    Giriş Yap
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FeatureSection */}
        <section id="features" className="w-full bg-gray-100/50 py-20 dark:bg-white/5 lg:py-24">
          <div className="container mx-auto max-w-6xl px-6">
            <div className="flex flex-col items-center gap-6 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl font-display">
                Sözleşmeleri Akıllıca Yönetmek İçin Her Şey
              </h2>
              <p className="max-w-3xl text-gray-700 dark:text-gray-300 md:text-lg">
                Papirai'yi organizasyonunuz için en güçlü ve sezgisel platform yapan temel özellikleri keşfedin.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon="account_tree"
                title="Organizasyon Hiyerarşileri"
                description="Esnek hiyerarşi sistemimizle kullanıcı rollerini ve izinlerini görselleştirin ve yönetin."
              />
              <FeatureCard
                icon="edit_document"
                title="Gelişmiş Sözleşme Editörü"
                description="Güçlü ve sezgisel bir editörle akıllı sözleşmeleri gerçek zamanlı olarak oluşturun, düzenleyin ve üzerinde işbirliği yapın."
              />
              <FeatureCard
                icon="task_alt"
                title="Otomatik Onay İş Akışları"
                description="Zaman kazanmak ve hataları azaltmak için sözleşme onay süreçlerinizi tanımlayın ve otomatikleştirin."
              />
              <FeatureCard
                icon="verified_user"
                title="Dahili Uyum Kontrolü"
                description="Otomatik uyum kontrolleri ile sözleşmelerinizin tüm yasal ve dahili düzenlemelere uymasını sağlayın."
              />
              <FeatureCard
                icon="integration_instructions"
                title="Sorunsuz Entegrasyonlar"
                description="Sorunsuz bir iş akışı için Papirai'yi mevcut araçlarınızla ve sistemlerinizle bağlayın."
              />
              <FeatureCard
                icon="history"
                title="Versiyon Kontrolü"
                description="Sözleşmelerinizdeki her değişikliği takip edin, sürümleri karşılaştırın ve gerektiğinde geri alın."
              />
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="w-full py-20 lg:py-24">
          <div className="container mx-auto max-w-6xl px-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl font-display">
                Lider Kuruluşlar Tarafından Güveniliyor
              </h2>
              <p className="max-w-2xl text-gray-700 dark:text-gray-300 md:text-lg">
                Müşterilerimizin Papirai ile elde ettikleri verimlilik ve güvenlik artışları hakkındaki görüşleri.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              <TestimonialCard
                image="https://lh3.googleusercontent.com/aida-public/AB6AXuAdvStwfwIpJF0ac_JjPjqcfFBVOJWICs_fuOjL0iQ3unDnGN0gAkDx3W5MCrdrxF3vk6EyRfF3yhUF9bAOpEqjLArxOlYEVH-x8BxymqnpuhsO9_p81lpR6p1D4jDznvyMSmcJKju2ipOB83bRlcdXGzVvJBND6i1bVchxP1isaYxiHzQ4-GTsOoH5knY1O3HjECBulNCq5dNGY3PyNxbZk4Y3sPepHGezs7BARiqmlpNDsKU-YOFWbuquoGtn6zLR5PlybRVWEhyq"
                name="Alex Johnson, CEO @ InnovateCorp"
                quote="Papirai, sözleşme yönetimimizi devrim yaratarak bize sayısız saat kazandırdı ve riski önemli ölçüde azalttı."
              />
              <TestimonialCard
                image="https://lh3.googleusercontent.com/aida-public/AB6AXuC_LgsUrj3BFAANIPjxipeYZeSEIlsIDI5wpuZZafaEdTtUukm9pJ6CZkHtlTjtaMKoJOoSyCsp7bN0gGNtApjTOyH88lE5tThKNgh2trHjKZNKm4y4ZhCV7N23YQaUKXmjybSoTYK0Tu5pV3TISJa5NLK9CRCTEWS5PEMaVHdc0ZrM7mXmw5hRKgKeiHkrnT_t38CoIEVtRrtAn5KE8SKYgl9lHguLzBA67EPPoy3uS488qQ9xEfFUYg-23QxWiBAkbRdNI1IJTpyU"
                name="Samantha Lee, Hukuk Başkanı @ TechSolutions"
                quote="Uyum kontrolü özellikleri hukuk ekibimiz için ezber bozan bir yenilik. Artık tüm sözleşmelerin düzenlemelere uymasını zahmetsizce sağlayabiliyoruz."
              />
              <TestimonialCard
                image="https://lh3.googleusercontent.com/aida-public/AB6AXuCiFVPYKhpUrtaq4g1Dx9tjqDdEPARMEpUkABB-wPDk5Un8FHlESUrtMxZ8VLqD877lqslMVWLn48n1A21YfJXg4GG47bmUQvD2nwSMkld79-i7HypuN4BFzWwVvlWEH7y7mJbrJqz32XLN-JxIqfhVQXdZElmuamEgvpHNl2xl7foG47HNoyQXotN1ViT9C-tWP4gM6R570_sFBbZKsAuS90xc5j4q931cNiA1BLNbjw-V-Whtntpy7TxqH8wi1tz9ARrAkcqdr6_v"
                name="David Chen, CTO @ NextGen Enterprises"
                quote="Mevcut sistemlerimizle sorunsuz entegrasyon büyük bir avantajdı. Platform güçlü ve inanılmaz derecede kullanımı kolay."
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full bg-primary/10 py-20 dark:bg-primary/5">
          <div className="container mx-auto max-w-4xl px-6 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl font-display">
              Sözleşme Yönetiminizi Dönüştürmeye Hazır mısınız?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-700 dark:text-gray-300">
              Bugün Papirai'ye katılın ve iş akışlarınızı basitleştirin, güvenliği artırın ve verimliliği en üst düzeye çıkarın.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto min-w-[84px] shadow-lg hover:scale-105 transition-transform">
                  Ücretsiz Başlayın
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto min-w-[84px]">
                  Giriş Yap
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-gray-100 dark:bg-black/20">
        <div className="container mx-auto max-w-6xl px-6 py-12">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div className="flex flex-col gap-4">
              <Logo href="/" size="md" />
              <p className="text-sm text-gray-600 dark:text-gray-300">Akıllı sözleşme yönetiminin geleceği.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Ürün</h3>
              <ul className="mt-4 space-y-2">
                <li>
                  <a className="text-sm text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors" href="#features">
                    Özellikler
                  </a>
                </li>
                <li>
                  <a className="text-sm text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors" href="#pricing">
                    Fiyatlandırma
                  </a>
                </li>
                <li>
                  <a className="text-sm text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors" href="#integrations">
                    Entegrasyonlar
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Şirket</h3>
              <ul className="mt-4 space-y-2">
                <li>
                  <a className="text-sm text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors" href="#about">
                    Hakkımızda
                  </a>
                </li>
                <li>
                  <a className="text-sm text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors" href="#careers">
                    Kariyer
                  </a>
                </li>
                <li>
                  <a className="text-sm text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors" href="#contact">
                    İletişim
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Yasal</h3>
              <ul className="mt-4 space-y-2">
                <li>
                  <a className="text-sm text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors" href="#privacy">
                    Gizlilik Politikası
                  </a>
                </li>
                <li>
                  <a className="text-sm text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors" href="#terms">
                    Hizmet Şartları
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-gray-200/80 pt-8 dark:border-white/10">
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">© 2024 Papirai. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-200/80 bg-background-light p-6 shadow-sm dark:border-white/10 dark:bg-background-dark">
      <span className="material-symbols-outlined text-4xl text-primary">{icon}</span>
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-bold font-display">{title}</h3>
        <p className="text-sm text-gray-700 dark:text-gray-300">{description}</p>
      </div>
    </div>
  );
}

function TestimonialCard({ image, name, quote }: { image: string; name: string; quote: string }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl bg-gray-100/50 p-6 text-center dark:bg-white/5">
      <img alt={name} className="h-20 w-20 rounded-full object-cover" src={image} />
      <div>
        <p className="font-semibold text-gray-900 dark:text-white font-display">{name}</p>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">&quot;{quote}&quot;</p>
      </div>
    </div>
  );
}

