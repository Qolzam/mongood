import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Editor, { OnMount, EditorProps, OnChange } from '@monaco-editor/react'
import { useDispatch } from 'react-redux'
import {
  Text,
  getTheme,
  IconButton,
  TooltipHost,
  DirectionalHint,
  DocumentCard,
  DocumentCardDetails,
} from '@fluentui/react'
import { evalCommand } from 'utils/collection'
import useDarkMode from 'hooks/use-dark-mode'
import { actions } from 'stores'
import { MongoData } from 'types'
import { storage } from 'utils/storage'
import useRouterQuery from 'hooks/use-router-query'
import { useConnection } from 'hooks/use-connections'
import MongoDataColorized from './pure/mongo-data-colorized'

export default function NotebookItem(props: {
  index?: number
  value?: string
  result?: MongoData
  error?: string
  ts?: number
}) {
  const isDarkMode = useDarkMode()
  const value = useRef<string>()
  const [result, setResult] = useState<MongoData>()
  const [error, setError] = useState<string>()
  const theme = getTheme()
  const [{ conn }] = useRouterQuery()
  const connection = useConnection(conn)
  const [isLoading, setIsLoading] = useState(false)
  const dispatch = useDispatch()
  const handleNext = useCallback(
    ({ _result, _error }: { _result?: MongoData; _error?: string }) => {
      if (value.current && (_result || _error)) {
        if (props.index !== undefined) {
          dispatch(
            actions.notebook.updateNotebook({
              index: props.index,
              value: value.current,
              result: _result,
              error: _error,
              ts: Date.now(),
            }),
          )
        } else {
          dispatch(
            actions.notebook.appendNotebook({
              value: value.current,
              result: _result,
              error: _error,
              ts: Date.now(),
            }),
          )
          setResult(undefined)
          setError(undefined)
          value.current = undefined
        }
      }
    },
    [dispatch, props.index, value],
  )
  const handleRunCommand = useCallback(
    async (commandStr?: string) => {
      if (!connection || !commandStr) {
        return
      }
      try {
        setIsLoading(true)
        const r = await evalCommand(connection, commandStr)
        const _result = typeof r === 'function' ? `Function ${r.name}` : r
        setResult(_result)
        setError(undefined)
        handleNext({ _result })
      } catch (err) {
        if (err instanceof Error) {
          setResult(undefined)
          const _error = err?.message?.startsWith('(CommandNotFound)')
            ? `Command Error: ${commandStr}`
            : err.message
          setError(_error)
          handleNext({ _error })
        }
      } finally {
        setIsLoading(false)
      }
    },
    [connection, handleNext],
  )
  useEffect(() => {
    value.current = props.value
  }, [props.value])
  useEffect(() => {
    setResult(props.result)
  }, [props.result])
  useEffect(() => {
    setError(props.error)
  }, [props.error])
  const handleEditorMount = useCallback<OnMount>(
    (editor) => {
      editor.onKeyDown(async (e) => {
        if (e.keyCode === 3 && (e.metaKey || e.ctrlKey)) {
          e.stopPropagation()
          await handleRunCommand(editor.getValue())
        }
      })
    },
    [handleRunCommand],
  )
  const handleChange = useCallback<OnChange>((v?: string) => {
    value.current = v
  }, [])
  const options = useMemo<EditorProps['options']>(
    () => ({
      tabSize: storage.tabSize.get,
      readOnly: isLoading,
      lineDecorationsWidth: 0,
      glyphMargin: false,
      folding: false,
      lineNumbers: 'off',
      minimap: { enabled: false },
      wordWrap: 'on',
      contextmenu: false,
      scrollbar: { verticalScrollbarSize: 0, horizontalSliderSize: 0 },
    }),
    [isLoading],
  )

  return (
    <>
      <DocumentCard
        styles={{
          root: {
            backgroundColor: isDarkMode ? '#1e1e1e' : '#fffffe',
            margin: 20,
            padding: 10,
            childrenGap: 0,
            maxWidth: 'unset',
            minHeight: 'unset',
          },
        }}
      >
        <div>
          <Editor
            height={5 * 18}
            language="typescript"
            value={value.current}
            onChange={handleChange}
            theme={isDarkMode ? 'vs-dark' : 'vs'}
            onMount={handleEditorMount}
            options={options}
          />
        </div>
        <DocumentCardDetails
          styles={{
            root: { display: 'flex', justifyContent: 'space-between' },
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <TooltipHost
              content="Run (⌘+↵)"
              directionalHint={DirectionalHint.bottomCenter}
              styles={{ root: { display: 'inline-block' } }}
            >
              <IconButton
                disabled={isLoading}
                iconProps={{ iconName: 'Play' }}
                onClick={() => {
                  handleRunCommand(value.current)
                }}
              />
            </TooltipHost>
            {props.ts ? (
              <Text
                styles={{ root: { color: theme.palette.neutralSecondary } }}
              >
                {new Date(props.ts).toLocaleString([], { hour12: false })}
              </Text>
            ) : null}
          </div>
          {props.index !== undefined ? (
            <IconButton
              disabled={isLoading}
              iconProps={{
                iconName: 'Delete',
                styles: { root: { color: theme.palette.red } },
              }}
              onClick={() => {
                if (props.index !== undefined) {
                  dispatch(actions.notebook.removeNotebook(props.index))
                }
              }}
            />
          ) : null}
        </DocumentCardDetails>
      </DocumentCard>
      {error ? (
        <pre
          style={{
            margin: 20,
            marginTop: 0,
            fontSize: 12,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            overflow: 'scroll',
            color: theme.palette.red,
          }}
        >
          {error}
        </pre>
      ) : result !== undefined ? (
        <MongoDataColorized
          value={result}
          style={{
            margin: 20,
            marginTop: 0,
          }}
        />
      ) : null}
    </>
  )
}
