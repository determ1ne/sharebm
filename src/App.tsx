import React, { useState, useEffect } from 'react';
import { Box, Card, CardBody, CardHeader, Center, Tag, HStack, Heading, IconButton, Input, Link, Spinner, StackDivider, Text, VStack, TagLabel, Button, TagRightIcon, TagCloseButton } from '@chakra-ui/react';
import Fuse from 'fuse.js';
import { AddIcon, ArrowForwardIcon, ExternalLinkIcon, RepeatClockIcon, SearchIcon, StarIcon } from '@chakra-ui/icons';
import './App.css';

type PMItem = {
  title: string;
  tags: string[];
  url: string;
  cache: string;
  comment: string;
  hint: string;
};
type LoadInfo = {
  loaded: boolean;
  blocksLoaded: number;
  blockCount: number;
  dataCount: number;
  tagCount: number;
}
const defaultLoadInfo: LoadInfo = {
  loaded: false,
  blocksLoaded: 0,
  blockCount: 0,
  dataCount: 0,
  tagCount: 0,
}

const LoadingIndicator = (props: { i: number, count: number }) => {
  let prompt = 'Loading blocks data';
  const { i, count } = props;
  if (count > 0) {
    if (i < count)
      prompt = `Loading ${i}/${count}`;
    else
      prompt = `Building index`;
  }
  return (
    <Center p={20}>
      <VStack spacing={10}>
        <Spinner />
        <Text fontSize='md'>{prompt}</Text>
      </VStack>
    </Center>
  )
}

const SearchResult = (props: { results: Fuse.FuseResult<PMItem>[] }) => {
  return (
    <VStack p='24px' w='100%'>
      {props.results.map(r => (
        <Card w='100%' key={r.refIndex}>
          <CardHeader paddingBottom='0.5rem'>
            <Heading size='md'>
              <Link href={r.item.url} display='flex' alignItems='center'>{r.item.title}<ExternalLinkIcon marginLeft='0.5rem' /></Link></Heading>
          </CardHeader>
          <CardBody paddingTop='0.5rem'>
            <VStack divider={<StackDivider />} spacing='4' align='start'>
              <Box>
                <HStack spacing='4'>
                  <Link href={r.item.url} isExternal><Button size='sm' rightIcon={<ArrowForwardIcon />} colorScheme='teal'>Visit Page</Button></Link>
                  <Link href={`/data/cached/${r.item.cache}`} isExternal><Button size='sm' rightIcon={<RepeatClockIcon />} colorScheme='gray'>Cached</Button></Link>
                  <Text>Matching score: {r.score?.toFixed(10)}</Text>
                </HStack>
              </Box>
              <Box>
                <Heading size='xs' textTransform='uppercase'>Tags</Heading>
                <HStack spacing='4' marginTop='0.5rem'>
                  {r.item.tags.map(tag => (
                    <Tag size='md' key={tag} variant='outline' colorScheme='blue'>
                      <TagLabel>{tag}</TagLabel>
                    </Tag>
                  ))}
                </HStack>
              </Box>
              {!!r.item.comment && (
                <Box>
                  <Heading size='xs' textTransform='uppercase'>Comment</Heading>
                  <Text pt='2' fontSize='sm'>{r.item.comment}</Text>
                </Box>
              )}
              {!!r.item.hint && (
                <Box>
                  <Text pt='2' fontSize='sm'>{r.item.hint.substring(0, 500)}...</Text>
                </Box>
              )}
            </VStack>
          </CardBody>
        </Card>
      )
      )}


    </VStack>
  );
}

const TagFilters = (props: {
  tagHints: string[],
  tagFilters: string[],
  removeTag: (tag: string) => void,
  addTag: (tag: string) => void
},
) => {
  const { tagHints, tagFilters, removeTag, addTag } = props;
  return (
    <HStack spacing={2} marginTop='0.5rem'>
      {tagFilters.map(tag => (
        <Tag size='md' variant='outline' colorScheme='cyan' key={tag} onClick={() => removeTag(tag)}>
          <TagLabel>{tag}</TagLabel>
          <TagCloseButton />
        </Tag>
      ))}
      {tagHints.map(tag => (
        <Tag size='md' colorScheme='gray' key={tag} onClick={() => addTag(tag)} >
          <TagLabel>{tag}</TagLabel>
          <TagRightIcon as={AddIcon} />
        </Tag>
      ))}
    </HStack>
  );
}

const removeDuplicates = <T,>(arr: T[]) => {
  const set = new Set(arr);
  return [...set];
}

const getTimeStamp = () => (new Date()).getTime();

const fuseCache: { [id: string]: Fuse<PMItem> } = {};
let fuse: Fuse<PMItem> = new Fuse([]);
let tagsFuse: Fuse<string> = new Fuse([]);
let data: PMItem[] = [];

function App() {
  const [info, setInfo] = useState({ ...defaultLoadInfo } as LoadInfo);
  const [tagHints, setTagHints] = useState([] as string[]);
  const [tagFilters, setTagFilters] = useState([] as string[]);
  const [inputValue, setInputValue] = useState('');
  const [searchResults, setSearchResults] = useState([] as Fuse.FuseResult<PMItem>[])

  const processQuery = (query: string) => {
    const t = query.trim();
    if (!t.startsWith('/')) {
      let r: Fuse.FuseResult<PMItem>[] = [];
      if (tagFilters.length > 0) {
        const tf = JSON.stringify(tagFilters);

        if (!fuseCache[tf]) {
          setInfo({
            ...info,
            loaded: false,
          });
          console.log(data);
          const d = data.filter(d => {
            return tagFilters.every(tag => d.tags.includes(tag))
          });
          fuseCache[tf] = new Fuse(d, {
            includeScore: true,
            includeMatches: true,
            findAllMatches: true,
            keys: [
              'title',
              'hint',
              'tags'
            ]
          });
          setInfo({
            ...info,
            loaded: true,
          });
        }
        console.log(fuseCache[tf])
        r = fuseCache[tf].search(t);
      } else {
        r = fuse.search(t);
      }
      console.log(r);
      setSearchResults(r);
      return;
    }
    // command
    let i = t.indexOf(' ')
    if (i === -1) i = t.length;
    const cmd = t.substring(1, i);
    const args = t.substring(i);
    switch (cmd) {
      case 't':
        addTag(args.trim());
        break;
      case 'r': {
        let count = parseInt(args);
        if (count <= 0 || isNaN(count)) count = 10;
        const len = data.length;
        const randItems = Array(count)
          .fill(undefined)
          .map(() => data[Math.floor(Math.random() * len)])
          .map(x => ({ item: x, score: 1., } as Fuse.FuseResult<PMItem>));
        setSearchResults(randItems);
        break;
      }
    }
  };
  const hInputKeyDown: React.KeyboardEventHandler<HTMLInputElement> = event => {
    if (event.key === 'Enter') {
      processQuery(inputValue);
    }
  };
  const hSearchButtonClicked: React.MouseEventHandler<HTMLButtonElement> = () => {
    processQuery(inputValue);
  };
  const hTextChange: React.ChangeEventHandler<HTMLInputElement> = event => {
    let v = event.target.value;
    v = v.trimStart();
    setInputValue(v);
    if (v.startsWith('/')) {
      // command
      let i = v.indexOf(' ')
      if (i === -1) i = v.length;
      const cmd = v.substring(1, i);
      const args = v.substring(i);
      switch (cmd) {
        case 't': {
          const t = args.trim();
          if (t.length === 0) {
            setTagHints([]);
            return;
          }
          const r = tagsFuse.search(t);
          setTagHints(r.slice(0, 10).map(x => x.item));
        }
      }
    }
  }
  const removeTag = (tag: string) => {
    const i = tagFilters.indexOf(tag);
    const _tagFilters = [...tagFilters];
    _tagFilters.splice(i, 1)
    setTagFilters(_tagFilters);
  };
  const addTag = (tag: string) => {
    setInputValue('');
    setTagHints([]);
    setTagFilters(removeDuplicates([...tagFilters, tag]));
  }

  useEffect(() => {
    const fetchData = async () => {
      let _info: LoadInfo = { ...defaultLoadInfo };
      let _data: PMItem[] = [];

      const blocksData = await (await fetch('/sharebm/data/index/blocks.json?' + getTimeStamp().toString())).json();
      _info = {
        ..._info,
        blockCount: blocksData.count,
      };
      setInfo(_info);

      const tagSet = new Set([] as string[]);

      for (let i = 1; i <= blocksData.count; ++i) {
        let url = `/sharebm/data/index/${i}.json`;
        if (i === blocksData.count) url += '?' + getTimeStamp().toString();
        const blockData: PMItem[] = await (await fetch(url)).json()
        blockData.map(
          x => x.tags.map(
            tag => tagSet.add(tag)));
        _data = [
          ..._data,
          ...blockData
        ]
        _info = {
          ..._info,
          blocksLoaded: i,
        }
        setInfo(_info);
      }

      fuse = new Fuse(_data, {
        includeScore: true,
        includeMatches: true,
        findAllMatches: true,
        keys: [
          'title',
          'hint',
          'tags'
        ]
      });

      const tags = [...tagSet];
      tagsFuse = new Fuse(tags);
      _info = {
        ..._info,
        tagCount: tags.length,
        dataCount: _data.length,
        loaded: true,
      }
      setInfo(_info);
      data = _data;
    }

    fetchData()
      .catch(e => {
        console.log(e);
        return;
      })
  }, []);

  return (
    <Box h='100%'>
      <Box bg='gray.50' w='100%' p={4} id='header'>
        <HStack spacing={8}>
          <Text fontSize='2xl'>ShareBM</Text>
          <Input
            variant='flushed'
            placeholder='Enter query here...'
            isDisabled={!info.loaded}
            onKeyDown={hInputKeyDown}
            onChange={hTextChange}
            value={inputValue} />
          <HStack spacing={2}>
            <IconButton
              colorScheme='gray'
              aria-label='Search'
              icon={<SearchIcon />}
              onClick={hSearchButtonClicked} />
            <IconButton
              colorScheme='gray'
              aria-label='Random Article'
              icon={<StarIcon />}
              onClick={() => { processQuery('/r') }} />
          </HStack>
        </HStack>
        <TagFilters tagHints={tagHints} tagFilters={tagFilters} removeTag={removeTag} addTag={addTag} />
      </Box>
      {info.loaded ? (
        <SearchResult results={searchResults} />
      ) : (
        <LoadingIndicator i={info.blocksLoaded} count={info.blockCount} />
      )}
      <Center h='100%'>
        {info.dataCount} Records, {info.tagCount} Tags.
      </Center>
    </Box>
  )
}

export default App
