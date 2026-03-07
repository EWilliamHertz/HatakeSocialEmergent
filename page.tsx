'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
  Package, Trash2, CheckSquare, Square, MoreHorizontal,
  Share2, Plus, Upload, Search, ShoppingBag, BookOpen, Star, TrendingUp,
} from 'lucide-react';
import { LayoutGrid, List as ListIcon, BookOpen as BinderIcon } from 'lucide-react';

import CollectionDashboard from '@/components/CollectionDashboard';

// Hooks
import { useCollection } from '@/hooks/useCollection';
import { useSelection } from '@/hooks/useSelection';
import { useCardSearch } from '@/hooks/useCardSearch';
import { useImport } from '@/hooks/useImport';
import { useTabData } from '@/hooks/useTabData';

// Components
import CardViews from '@/components/collection/CardViews';
import EditCardModal from '@/components/collection/EditCardModal';
import AddCardModal from '@/components/collection/AddCardModal';
import BulkListModal from '@/components/collection/BulkListModal';
import ImportModal from '@/components/collection/ImportModal';
import TabContent from '@/components/collection/TabContent';

type ActiveTab = 'cards' | 'sealed' | 'wishlist' | 'bookmarks' | 'analytics';
type ViewMode = 'grid' | 'list' | 'binder';

export default function CollectionPage() {
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeTab, setActiveTab] = useState<ActiveTab>('cards');
  const [editingItem, setEditingItem] = useState<any>(null);

  // Core collection data + CRUD
  const collection = useCollection(filter);

  // Filtered items (derived)
  const filteredItems = collection.items.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      item.card_data?.name?.toLowerCase().includes(q) ||
      item.card_data?.set_name?.toLowerCase().includes(q) ||
      item.card_data?.set?.name?.toLowerCase().includes(q) ||
      item.card_data?.set_code?.toLowerCase().includes(q) ||
      item.card_data?.set?.id?.toLowerCase().includes(q) ||
      (typeof item.card_data?.set === 'string' && item.card_data.set.toLowerCase().includes(q)) ||
      item.card_data?.collector_number?.toString().toLowerCase().includes(q) ||
      item.card_data?.number?.toString().toLowerCase().includes(q) ||
      item.card_data?.localId?.toString().toLowerCase().includes(q) ||
      item.condition?.toLowerCase().includes(q) ||
      item.finish?.toLowerCase().includes(q) ||
      (q === 'foil' && item.foil)
    );
  });

  // Selection + bulk actions
  const selection = useSelection(collection.items, filteredItems, collection.getCardPrice);

  // Card search + add flow
  const cardSearch = useCardSearch();

  // CSV import
  const importHook = useImport(collection.loadCollection);

  // Wishlist / Sealed / Bookmarks
  const tabData = useTabData(activeTab);

  const TABS: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'cards', label: 'Cards', icon: <Package className="w-4 h-4" /> },
    { id: 'sealed', label: 'Sealed Products', icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'wishlist', label: 'Wishlist', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'bookmarks', label: 'Bookmarks', icon: <Star className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <TrendingUp className="w-4 h-4" /> },
  ];

  const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'mtg', label: 'Magic' },
    { id: 'pokemon', label: 'Pokémon' },
    { id: 'lorcana', label: 'Lorcana' },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900" style={{ height: '100dvh' }}>
      <Navbar />

      {/* ── Sticky toolbar ─────────────────────────────────────────── */}
      <div className="shrink-0 z-40 bg-gray-50 dark:bg-gray-900 shadow-sm">
        <div className="container mx-auto px-4 pt-4 pb-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">

            {/* Tabs */}
            <div className="flex items-center gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
              {TABS.map(({ id, label, icon }) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={`px-4 py-3 font-semibold transition border-b-2 -mb-px flex items-center gap-2 ${
                    activeTab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                  }`}>
                  {icon}{label}
                </button>
              ))}
            </div>

            {/* Cards tab header */}
            {activeTab === 'cards' && (
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-bold dark:text-white">My Collection</h1>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={collection.handleShareCollection}
                    className="px-4 py-2 rounded-lg font-semibold bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-2">
                    <Share2 className="w-4 h-4" /> Share
                  </button>
                  <button onClick={() => cardSearch.setShowAddCardModal(true)}
                    className="px-4 py-2 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
                    data-testid="add-card-btn">
                    <Plus className="w-4 h-4" /> Add Card
                  </button>
                  <button onClick={() => importHook.setShowImportModal(true)}
                    className="px-4 py-2 rounded-lg font-semibold bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
                    data-testid="import-btn">
                    <Upload className="w-4 h-4" /> Import CSV
                  </button>
                  {FILTERS.map(({ id, label }) => (
                    <button key={id} onClick={() => setFilter(id)}
                      className={`px-4 py-2 rounded-lg font-semibold transition ${filter === id ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                      data-testid={`filter-${id}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search + bulk controls (cards tab only) */}
            {activeTab === 'cards' && (
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search your collection..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    data-testid="collection-search" />
                </div>

                {collection.items.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button onClick={selection.selectAll}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white"
                      data-testid="select-all-btn">
                      {selection.selectedItems.size === filteredItems.length && filteredItems.length > 0
                        ? <CheckSquare className="w-4 h-4 text-blue-600" />
                        : <Square className="w-4 h-4" />}
                      Select All
                    </button>

                    {selection.selectedItems.size > 0 && (
                      <>
                        <button onClick={selection.clearSelection}
                          className="flex items-center gap-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white text-sm">
                          ✕ Clear
                        </button>
                        <div className="relative">
                          <button onClick={() => selection.setShowBulkMenu(!selection.showBulkMenu)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            data-testid="bulk-actions-btn">
                            {selection.selectedItems.size} selected <MoreHorizontal className="w-4 h-4" />
                          </button>
                          {selection.showBulkMenu && (
                            <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 z-10 min-w-48">
                              <button onClick={() => { selection.openBulkList(); selection.setShowBulkMenu(false); }}
                                className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-2 dark:text-white dark:hover:bg-gray-700"
                                data-testid="bulk-list-btn">
                                <ShoppingBag className="w-4 h-4" /> List for Sale
                              </button>
                              <button onClick={() => { selection.bulkDelete(collection.loadCollection); selection.setShowBulkMenu(false); }}
                                className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-2 text-red-600 dark:hover:bg-gray-700"
                                data-testid="bulk-delete-btn">
                                <Trash2 className="w-4 h-4" /> Delete Selected
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Scrollable content ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="container mx-auto px-4 pb-24 md:pb-8 pt-4">

          {activeTab === 'cards' && (
            <>
              <CollectionDashboard
                items={collection.items}
                priceOverrides={collection.priceOverrides}
                pricesLoading={collection.pricesLoading}
              />

              {/* View mode toggles */}
              <div className="flex justify-end mb-4">
                <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                  {([
                    { mode: 'grid', icon: <LayoutGrid className="w-4 h-4" />, title: 'Grid View' },
                    { mode: 'binder', icon: <BinderIcon className="w-4 h-4" />, title: 'Binder View' },
                    { mode: 'list', icon: <ListIcon className="w-4 h-4" />, title: 'List View' },
                  ] as const).map(({ mode, icon, title }) => (
                    <button key={mode} onClick={() => setViewMode(mode)} title={title}
                      className={`p-2 rounded-md transition ${viewMode === mode ? 'bg-white dark:bg-gray-600 shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {collection.loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
                  <Package className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    {collection.items.length === 0 ? 'Your collection is empty' : 'No cards match your search'}
                  </p>
                  {collection.items.length === 0 && (
                    <button onClick={() => router.push('/search')}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                      data-testid="search-cards-btn">
                      Search Cards
                    </button>
                  )}
                </div>
              ) : (
                <CardViews
                  filteredItems={filteredItems}
                  viewMode={viewMode}
                  selectedItems={selection.selectedItems}
                  toggleItemSelection={selection.toggleItemSelection}
                  onEdit={(item) => setEditingItem(item)}
                  onRemove={collection.removeItem}
                  getCardImage={collection.getCardImage}
                  getPriceDisplay={collection.getPriceDisplay}
                />
              )}
            </>
          )}

          {activeTab !== 'cards' && (
            <TabContent
              activeTab={activeTab}
              sealedProducts={tabData.sealedProducts}
              loadingSealed={tabData.loadingSealed}
              showAddSealedModal={tabData.showAddSealedModal}
              setShowAddSealedModal={tabData.setShowAddSealedModal}
              sealedSearch={tabData.sealedSearch}
              setSealedSearch={tabData.setSealedSearch}
              sealedSearchResults={tabData.sealedSearchResults}
              isSearchingSealed={tabData.isSearchingSealed}
              manualSealed={tabData.manualSealed}
              setManualSealed={tabData.setManualSealed}
              addingSealedProduct={tabData.addingSealedProduct}
              onSealedSearch={tabData.handleSealedSearch}
              onAddSealedFromSearch={tabData.addSealedFromSearch}
              onAddSealedManual={tabData.addSealedManually}
              wishlistItems={tabData.wishlistItems}
              loadingWishlist={tabData.loadingWishlist}
              bookmarkedCollections={tabData.bookmarkedCollections}
              loadingBookmarks={tabData.loadingBookmarks}
              onRemoveBookmark={tabData.removeBookmark}
            />
          )}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────── */}
      {editingItem && (
        <EditCardModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={(id, updates) => { collection.updateItem(id, updates); setEditingItem(null); }}
          onCollectionReload={collection.loadCollection}
          getCardImage={collection.getCardImage}
        />
      )}

      {cardSearch.showAddCardModal && (
        <AddCardModal
          addCardGame={cardSearch.addCardGame} setAddCardGame={cardSearch.setAddCardGame}
          addCardName={cardSearch.addCardName} setAddCardName={cardSearch.setAddCardName}
          addCardSetCode={cardSearch.addCardSetCode} setAddCardSetCode={cardSearch.setAddCardSetCode}
          addCardCollectorNum={cardSearch.addCardCollectorNum} setAddCardCollectorNum={cardSearch.setAddCardCollectorNum}
          addCardLang={cardSearch.addCardLang} setAddCardLang={cardSearch.setAddCardLang}
          addCardSearchResults={cardSearch.addCardSearchResults} setAddCardSearchResults={cardSearch.setAddCardSearchResults}
          addCardSearching={cardSearch.addCardSearching}
          searchCardManually={cardSearch.searchCardManually}
          onClose={cardSearch.closeAddModal}
          selectedCardToAdd={cardSearch.selectedCardToAdd} setSelectedCardToAdd={cardSearch.setSelectedCardToAdd}
          addCardQuantity={cardSearch.addCardQuantity} setAddCardQuantity={cardSearch.setAddCardQuantity}
          addCardCondition={cardSearch.addCardCondition} setAddCardCondition={cardSearch.setAddCardCondition}
          cardFinish={cardSearch.cardFinish} setCardFinish={cardSearch.setCardFinish}
          isGraded={cardSearch.isGraded} setIsGraded={cardSearch.setIsGraded}
          isSigned={cardSearch.isSigned} setIsSigned={cardSearch.setIsSigned}
          gradingCompany={cardSearch.gradingCompany} setGradingCompany={cardSearch.setGradingCompany}
          gradeValue={cardSearch.gradeValue} setGradeValue={cardSearch.setGradeValue}
          cardPriceData={cardSearch.cardPriceData} setCardPriceData={cardSearch.setCardPriceData}
          addingCard={cardSearch.addingCard}
          addCardToCollection={cardSearch.addCardToCollection}
          onSuccess={collection.loadCollection}
        />
      )}

      {selection.showListModal && (
        <BulkListModal
          selectedItems={selection.selectedItems}
          items={collection.items}
          listCondition={selection.listCondition} setListCondition={selection.setListCondition}
          listPercent={selection.listPercent} setListPercent={selection.setListPercent}
          individualPrices={selection.individualPrices} setIndividualPrices={selection.setIndividualPrices}
          listingInProgress={selection.listingInProgress}
          calculateSelectedValue={selection.calculateSelectedValue}
          calculateListingTotal={selection.calculateListingTotal}
          recalculateAllPrices={selection.recalculateAllPrices}
          onSubmit={() => selection.submitBulkList(collection.loadCollection)}
          onClose={selection.closeBulkListModal}
          getCardImage={collection.getCardImage}
          getCardPrice={collection.getCardPrice}
        />
      )}

      {importHook.showImportModal && (
        <ImportModal
          fileInputRef={importHook.fileInputRef}
          importStatus={importHook.importStatus} setImportStatus={importHook.setImportStatus}
          importCards={importHook.importCards} setImportCards={() => importHook.closeImportModal()}
          importLoading={importHook.importLoading}
          importResult={importHook.importResult}
          importGameType={importHook.importGameType} setImportGameType={importHook.setImportGameType}
          totalCardsToImport={importHook.totalCardsToImport}
          onFileUpload={importHook.handleFileUpload}
          onConfirmImport={importHook.confirmImport}
          onClose={importHook.closeImportModal}
        />
      )}
    </div>
  );
}
