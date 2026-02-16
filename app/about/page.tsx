'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Users, MapPin, Mail, Linkedin, Globe, Package, Truck, Database } from 'lucide-react';

interface TeamMember {
  name: string;
  role: string;
  description: string;
  image: string;
}

const teamMembers: TeamMember[] = [
  {
    name: 'Ernst-William Hertz',
    role: 'Founder',
    description: 'An active Magic: The Gathering player from 2007-2017, returning in 2023. The sole designer and visionary behind the HatakeSocial platform.',
    image: 'https://i.imgur.com/op0pjSl.jpeg',
  },
  {
    name: 'Patricia Andersson',
    role: 'CEO',
    description: 'Mother of Ernst-William, Patricia studied business economics and works as a prison officer. She proudly raised two Magic-playing children.',
    image: 'https://i.imgur.com/6klWTRC.jpeg',
  },
  {
    name: 'Mark Lange Jensen',
    role: 'Co-founder',
    description: 'An avid gamer, dedicated beta tester, and a source of great moral support, Mark has been instrumental in shaping the user experience.',
    image: 'https://i.imgur.com/1Oiiulk.jpeg',
  },
  {
    name: 'Virre Van Zarate Abreu',
    role: 'Conventional Manager',
    description: 'A great entrepreneur with a keen business sense, Virre acts as our conventional manager, guiding our strategic growth and operations.',
    image: 'https://i.imgur.com/b5cE8AK.jpeg',
  },
  {
    name: 'Phoebe Wang',
    role: 'Partner in Asia',
    description: 'Our Chinese Partner who oversees merchandise production and serves as our key liaison for building our network and presence in China. Phoebe plays a crucial role in our global reach and quality assurance.',
    image: 'https://firebasestorage.googleapis.com/v0/b/hatakesocial-88b5e.firebasestorage.app/o/IMG_8321.webp?alt=media&token=trading-hub-test',
  },
];

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="https://i.imgur.com/B06rBhI.png"
              alt="Hatake.Social Logo"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <span className="font-bold text-xl text-gray-900 dark:text-white">Hatake.Social</span>
          </Link>
          <div className="w-20"></div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="flex justify-center mb-6">
            <Image
              src="https://i.imgur.com/B06rBhI.png"
              alt="Hatake.Social Logo"
              width={100}
              height={100}
              className="rounded-2xl shadow-lg"
            />
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
            <MapPin className="w-4 h-4" />
            <span>Sweden-based</span>
            <span className="mx-2">•</span>
            <Users className="w-4 h-4" />
            <span>TCG community</span>
            <span className="mx-2">•</span>
            <Package className="w-4 h-4" />
            <span>Wholesale supply chain</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            About HatakeSocial
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            HatakeSocial is our attempt to build two things at once — because they belong together. 
            First: a chain of healthy suppliers that can move top-notch, high-quality TCG products across Europe. 
            Reliable stock, clean product data, and fair logistics. Second: a social platform that pulls collectors together. 
            A place to show your collection, find trades, message safely, and meet the people behind the binders. 
            Our long-term goal is to strengthen local game shops too — with better discovery, clearer events, 
            and eventually real partnerships that help the community grow offline.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-white/50 dark:bg-gray-800/50">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center mb-4">
                <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Bulk import</h3>
              <p className="text-gray-600 dark:text-gray-300">
                We source and import merch in bulk so stores can restock reliably and plan campaigns.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-xl flex items-center justify-center mb-4">
                <Truck className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">EU dispatch from Sweden</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Fast shipping within the EU, with clear product info and consistent packaging.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-xl flex items-center justify-center mb-4">
                <Database className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Clean catalog data</h3>
              <p className="text-gray-600 dark:text-gray-300">
                The products you manage in Admin → Shop are what customers see — images, pricing, and details.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What We're Building */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
            What HatakeSocial is building
          </h2>
          <div className="space-y-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
              <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-4">A collector social network</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Collections, messaging, trades, community posts, and profiles — built to help collectors find each other and feel safe doing business.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
              <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-4">Local game shops, amplified</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Our long-term dream is to support local gaming shops and events across Europe — and eventually open / partner with shops to spread our passion for TCGs.
              </p>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed mt-4">
                We believe the best communities happen offline too: Friday Night Magic, prereleases, casual Commander nights, and tournaments where you make friends. The platform should make those moments easier to discover and join.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Vision */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-6">The Vision</h2>
          <p className="text-xl leading-relaxed opacity-90">
            We want HatakeSocial to be the place where collectors feel at home — and where stores feel supported. 
            A clean supply chain makes the hobby healthier. A strong social network makes the hobby warmer.
          </p>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-4">Our Team</h2>
          <p className="text-gray-600 dark:text-gray-400 text-center mb-12">The people behind HatakeSocial</p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {teamMembers.map((member) => (
              <div 
                key={member.name} 
                className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="h-64 relative">
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-xl text-gray-900 dark:text-white">{member.name}</h3>
                  <p className="text-blue-600 dark:text-blue-400 font-medium mb-3">{member.role}</p>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{member.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 px-4 bg-white/50 dark:bg-gray-800/50">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Get in Touch</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            Interested in partnering with us or have questions about our platform?
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link 
              href="/feed"
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Globe className="w-5 h-5" />
              Join the Community
            </Link>
            <a 
              href="mailto:contact@hatake.social"
              className="px-8 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-semibold hover:bg-gray-100 dark:hover:bg-gray-600 transition border border-gray-200 dark:border-gray-600 flex items-center gap-2"
            >
              <Mail className="w-5 h-5" />
              Contact Us
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Image
                src="https://i.imgur.com/B06rBhI.png"
                alt="Hatake.Social Logo"
                width={40}
                height={40}
                className="rounded-lg"
              />
              <span className="font-bold text-xl">Hatake.Social</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <Link href="/" className="hover:text-white transition">Home</Link>
              <Link href="/shop" className="hover:text-white transition">Shop</Link>
              <Link href="/feed" className="hover:text-white transition">Community</Link>
              <Link href="/about" className="hover:text-white transition">About</Link>
            </div>
            <p className="text-sm text-gray-500">© {new Date().getFullYear()} Hatake.Social. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
