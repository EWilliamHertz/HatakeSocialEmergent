'use client';

import Navbar from '@/components/Navbar';
import { ShieldAlert, Scale, AlertTriangle, FileText } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <Navbar />
      
      {/* Hero Header */}
      <div className="bg-blue-600 text-white py-16">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <Scale className="w-12 h-12 mx-auto mb-4 opacity-80" />
          <h1 className="text-4xl font-extrabold mb-4">Terms of Service</h1>
          <p className="text-blue-100 text-lg">Last Updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* Content Container */}
      <div className="container mx-auto px-4 max-w-4xl -mt-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 md:p-12 prose prose-lg dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
          
          <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 mb-8 rounded-r-lg">
            <h3 className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-bold m-0 mb-2 text-lg">
              <AlertTriangle className="w-5 h-5" />
              Disclaimer of Liability for User Transactions
            </h3>
            <p className="m-0 text-sm text-amber-900 dark:text-amber-300">
              Hatake Social is strictly a communication and networking platform for Trading Card Game (TCG) enthusiasts. 
              <strong> We do not broker, guarantee, insure, or facilitate actual payments or shipping. </strong> 
              All trades, purchases, and sales arranged on this platform are made strictly at your own risk.
            </p>
          </div>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using Hatake Social ("the Platform", "we", "us", or "our"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            Hatake Social provides digital tools allowing users to catalogue their TCG collections, discover other collectors, communicate via text and video, and propose peer-to-peer card trades or sales. 
          </p>

          <h2>3. Peer-to-Peer Transactions (Trades & Sales)</h2>
          <p>
            The Platform provides a "Trade" feature that allows users to mutually agree upon an exchange of items (with or without cash). By using this feature, you explicitly acknowledge and agree to the following:
          </p>
          <ul>
            <li><strong>We are not a party to the transaction:</strong> Hatake Social is not a buyer, seller, auctioneer, or broker. The contract of sale or trade is strictly between you and the other user.</li>
            <li><strong>No Payment Processing:</strong> Any monetary exchange (e.g., Swish, Bankgiro, PayPal) is conducted entirely outside of Hatake Social. We do not hold funds in escrow and cannot issue refunds.</li>
            <li><strong>No Shipping Guarantees:</strong> Users are solely responsible for packaging, shipping, and providing tracking for their items. We are not liable for items that are lost, damaged, stolen, or misdirected in transit.</li>
            <li><strong>Fraud and Misrepresentation:</strong> While we utilize a community Reputation and Rating system, we do not verify the authenticity, condition, or existence of the physical cards listed by users. You are responsible for conducting your own due diligence before initiating a trade or sending money.</li>
          </ul>

          <div className="bg-gray-100 dark:bg-gray-700 p-6 rounded-xl my-8">
            <h3 className="flex items-center gap-2 text-gray-900 dark:text-white font-bold m-0 mb-2">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              Resolution of Disputes
            </h3>
            <p className="m-0 text-sm">
              Because Hatake Social is not a party to any peer-to-peer transaction, we cannot arbitrate or resolve disputes regarding unpaid items, lost mail, or card condition disagreements. Users must resolve disputes among themselves or through their chosen payment provider (e.g., PayPal Goods & Services). We reserve the right, but have no obligation, to ban users who receive consistently poor reputation ratings or reports of fraudulent activity.
            </p>
          </div>

          <h2>4. User Conduct & Community Guidelines</h2>
          <p>By using the Platform, you agree not to:</p>
          <ul>
            <li>Post counterfeit, proxy, or proxy-pass cards without explicitly marking them as such.</li>
            <li>Harass, threaten, or doxx other users in public feeds or private messages.</li>
            <li>Use the Platform to conduct illegal activities, including money laundering or scams.</li>
            <li>Spam the marketplace or community feeds.</li>
          </ul>
          <p>
            We reserve the right to suspend or terminate the account of any user who violates these guidelines, at our sole discretion, without prior notice.
          </p>

          <h2>5. Intellectual Property</h2>
          <p>
            Card images, set symbols, and game names are the intellectual property of their respective creators (e.g., Wizards of the Coast, The Pokémon Company, Ravensburger). Hatake Social is an independent fan and collector platform and is not affiliated with, endorsed, sponsored, or specifically approved by these copyright holders.
          </p>

          <h2>6. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL HATAKE SOCIAL, ITS AFFILIATES, DIRECTORS, OR EMPLOYEES BE LIABLE FOR ANY INDIRECT, PUNITIVE, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR EXEMPLARY DAMAGES, INCLUDING WITHOUT LIMITATION, DAMAGES FOR LOSS OF PROFITS, GOODWILL, USE, DATA, OR PHYSICAL TRADING CARDS, ARISING OUT OF OR RELATING TO THE USE OF, OR INABILITY TO USE, THE SERVICE.
          </p>

          <h2>7. Changes to the Terms</h2>
          <p>
            We reserve the right to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
          </p>

          <hr className="my-8 border-gray-200 dark:border-gray-700" />
          
          <p className="text-sm text-gray-500 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            If you have any questions about these Terms, please contact us at support@hatake.eu.
          </p>
        </div>
      </div>
    </div>
  );
}