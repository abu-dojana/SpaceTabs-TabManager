import React from 'react';
import { Folder, Layers, ExternalLink, Archive, ArrowRight, ChevronDown } from 'lucide-react';
import {
  type SpaceSearchResultItem,
  type SpaceGroupResult,
  type SearchResultItem,
} from '../useGlobalSearch';
import { HighlightText } from './HighlightText';
import { SearchResultRow } from './SearchResultRow';

interface SpaceResultsBlockProps {
  spaces: SpaceSearchResultItem[];
  totalSpacesCount: number;
  showAllSpaces: boolean;
  selectedIndex: number;
  startFlatIndex: number;
  searchWords: string[];
  isLight: boolean;
  onSelectIndex: (index: number) => void;
  onNavigateToSpace: (spaceItem: SpaceSearchResultItem) => void;
  onOpenSpaceInNewWindow: (e: React.MouseEvent, spaceItem: SpaceSearchResultItem) => void;
  onToggleShowAllSpaces: () => void;
}

export const SpaceResultsBlock: React.FC<SpaceResultsBlockProps> = ({
  spaces,
  totalSpacesCount,
  showAllSpaces,
  selectedIndex,
  startFlatIndex,
  searchWords,
  isLight,
  onSelectIndex,
  onNavigateToSpace,
  onOpenSpaceInNewWindow,
  onToggleShowAllSpaces,
}) => {
  if (spaces.length === 0) return null;

  const hiddenCount = totalSpacesCount - spaces.length;

  return (
    <div className="py-1.5">
      <div className="px-3.5 py-1 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-400">
          <Folder className="w-3 h-3" />
          <span>Spaces ({totalSpacesCount})</span>
        </div>
        <span className="text-[10px] text-slate-500">Click to switch space</span>
      </div>

      <div className="mt-0.5 space-y-0.5 px-1.5">
        {spaces.map((sp, idx) => {
          const itemIndex = startFlatIndex + idx;
          const isSelected = itemIndex === selectedIndex;

          return (
            <div
              key={sp.id}
              onMouseEnter={() => onSelectIndex(itemIndex)}
              onClick={() => onNavigateToSpace(sp)}
              className={`group flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer transition ${
                isSelected
                  ? isLight
                    ? 'bg-blue-50 border border-blue-200'
                    : 'bg-blue-500/15 border border-blue-500/30'
                  : isLight
                  ? 'hover:bg-slate-100 border border-transparent'
                  : 'hover:bg-slate-900 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className="text-base flex-shrink-0">{sp.spaceIcon}</span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {sp.sectionName && (
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0 ${
                          isLight
                            ? 'bg-slate-200/80 text-slate-600'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <HighlightText
                          text={sp.sectionName}
                          words={sp.matchedWords.length ? sp.matchedWords : searchWords}
                          isLight={isLight}
                        />
                      </span>
                    )}

                    <span
                      className={`text-xs font-bold truncate ${
                        isLight ? 'text-slate-900' : 'text-slate-100'
                      }`}
                    >
                      <HighlightText
                        text={sp.spaceName}
                        words={sp.matchedWords.length ? sp.matchedWords : searchWords}
                        isLight={isLight}
                      />
                    </span>

                    <span className="inline-flex items-center px-1.5 py-0 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-400 flex-shrink-0">
                      SPACE
                    </span>

                    {sp.isCurrentSpace && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                          isLight
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        Current
                      </span>
                    )}

                    {sp.isArchived && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex-shrink-0">
                        <Archive className="w-2.5 h-2.5" />
                        Archived
                      </span>
                    )}
                  </div>

                  {sp.description && (
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      <HighlightText
                        text={sp.description}
                        words={sp.matchedWords.length ? sp.matchedWords : searchWords}
                        isLight={isLight}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-[10px] text-slate-500 font-mono">
                  {sp.tabCount} tab{sp.tabCount === 1 ? '' : 's'}
                </span>

                <button
                  type="button"
                  onClick={(e) => onOpenSpaceInNewWindow(e, sp)}
                  className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[10px] font-medium flex items-center gap-1 transition ${
                    isLight
                      ? 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 shadow-sm'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                  title="Open this Space in a new window"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>

                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 transition" />
              </div>
            </div>
          );
        })}

        {hiddenCount > 0 && !showAllSpaces && (
          <button
            type="button"
            onClick={onToggleShowAllSpaces}
            className={`w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              isLight
                ? 'text-blue-600 hover:bg-blue-50'
                : 'text-blue-400 hover:bg-slate-900'
            }`}
          >
            <ChevronDown className="w-3.5 h-3.5" />
            <span>Show {hiddenCount} more matching space{hiddenCount === 1 ? '' : 's'}…</span>
          </button>
        )}
      </div>
    </div>
  );
};

interface SpaceGroupSectionProps {
  group: SpaceGroupResult;
  visibleItems: SearchResultItem[];
  hiddenItemsCount: number;
  startFlatIndex: number;
  selectedIndex: number;
  isLight: boolean;
  showTabFavicons: boolean;
  searchWords: string[];
  onClickGroupHeader: () => void;
  onSelectIndex: (idx: number) => void;
  onNavigateToResult: (item: SearchResultItem) => void;
  onOpenLinkOnly: (e: React.MouseEvent, url: string) => void;
  onExpandGroup: () => void;
}

export const SpaceGroupSection: React.FC<SpaceGroupSectionProps> = ({
  group,
  visibleItems,
  hiddenItemsCount,
  startFlatIndex,
  selectedIndex,
  isLight,
  showTabFavicons,
  searchWords,
  onClickGroupHeader,
  onSelectIndex,
  onNavigateToResult,
  onOpenLinkOnly,
  onExpandGroup,
}) => {
  return (
    <div className="py-1.5">
      {/* Space Group Header */}
      <div
        onClick={onClickGroupHeader}
        className={`px-3.5 py-1.5 flex items-center justify-between cursor-pointer transition ${
          isLight ? 'hover:bg-slate-100/80' : 'hover:bg-slate-900/70'
        }`}
        title={`Go to ${group.spaceName}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {group.isUnsaved ? (
            <Layers className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          ) : (
            <span className="text-sm flex-shrink-0">{group.spaceIcon}</span>
          )}
          {group.sectionName && (
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0 ${
                isLight
                  ? 'bg-slate-200/80 text-slate-600'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {group.sectionName}
            </span>
          )}
          <span
            className={`text-xs font-bold truncate ${
              isLight ? 'text-slate-900' : 'text-slate-100'
            }`}
          >
            <HighlightText
              text={group.spaceName}
              words={searchWords}
              isLight={isLight}
            />
          </span>
          {group.isCurrentSpace && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                isLight
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              Current Space
            </span>
          )}
          {group.isArchived && (
            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex-shrink-0">
              <Archive className="w-2.5 h-2.5" />
              Archived
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 flex-shrink-0">
          <span>
            {group.items.length} item{group.items.length === 1 ? '' : 's'}
          </span>
          <ArrowRight className="w-3 h-3" />
        </div>
      </div>

      {/* Matching Items in this Space */}
      <div className="mt-0.5 space-y-0.5 px-1.5">
        {visibleItems.map((item, idx) => {
          const itemIndex = startFlatIndex + idx;
          return (
            <SearchResultRow
              key={item.id}
              item={item}
              isSelected={itemIndex === selectedIndex}
              isLight={isLight}
              showTabFavicons={showTabFavicons}
              searchWords={searchWords}
              onMouseEnter={() => onSelectIndex(itemIndex)}
              onClick={() => onNavigateToResult(item)}
              onOpenLinkOnly={onOpenLinkOnly}
            />
          );
        })}

        {hiddenItemsCount > 0 && (
          <button
            type="button"
            onClick={onExpandGroup}
            className={`w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              isLight
                ? 'text-blue-600 hover:bg-blue-50'
                : 'text-blue-400 hover:bg-slate-900'
            }`}
          >
            <ChevronDown className="w-3.5 h-3.5" />
            <span>
              Show {hiddenItemsCount} more in {group.spaceName}…
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
