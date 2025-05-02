import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Button } from '@/components/ui/button';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Quote, 
  Heading1, 
  Heading2, 
  Undo, 
  Redo, 
  Link as LinkIcon,
  Image as ImageIcon,
  Code
} from 'lucide-react';
import { useCallback, useEffect } from 'react';

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
  autofocus?: boolean;
  className?: string;
}

export function TiptapEditor({ 
  content, 
  onChange, 
  placeholder = 'Start writing...',
  editable = true,
  autofocus = false,
  className = ''
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
      Image,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer',
        },
      }),
    ],
    content,
    editable,
    autofocus,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link')
      .setLink({ href: url, target: '_blank' }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    
    const url = window.prompt('Image URL');
    
    if (url) {
      editor.chain().focus().setImage({ src: url, alt: 'Image' }).run();
    }
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={`border rounded-md ${className}`}>
      {editable && (
        <div className="border-b p-1 flex flex-wrap gap-1 bg-background">
          <EditorMenuButton 
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </EditorMenuButton>
          
          <EditorMenuButton 
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </EditorMenuButton>
          
          <EditorMenuButton 
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </EditorMenuButton>
          
          <EditorMenuButton 
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </EditorMenuButton>
          
          <EditorMenuButton 
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </EditorMenuButton>
          
          <EditorMenuButton 
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Ordered List"
          >
            <ListOrdered className="h-4 w-4" />
          </EditorMenuButton>
          
          <EditorMenuButton 
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            title="Quote"
          >
            <Quote className="h-4 w-4" />
          </EditorMenuButton>
          
          <EditorMenuButton 
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive('codeBlock')}
            title="Code Block"
          >
            <Code className="h-4 w-4" />
          </EditorMenuButton>
          
          <EditorMenuButton 
            onClick={setLink}
            active={editor.isActive('link')}
            title="Link"
          >
            <LinkIcon className="h-4 w-4" />
          </EditorMenuButton>
          
          <EditorMenuButton 
            onClick={addImage}
            active={false}
            title="Image"
          >
            <ImageIcon className="h-4 w-4" />
          </EditorMenuButton>
          
          <div className="mx-1 border-l h-6"></div>
          
          <EditorMenuButton 
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </EditorMenuButton>
          
          <EditorMenuButton 
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <Redo className="h-4 w-4" />
          </EditorMenuButton>
        </div>
      )}
      <EditorContent editor={editor} className="p-3 min-h-[150px] prose dark:prose-invert max-w-none prose-sm sm:prose-base lg:prose-lg prose-headings:font-semibold prose-blockquote:border-l-primary prose-blockquote:border-l-2 prose-blockquote:pl-4 prose-blockquote:italic" />
    </div>
  );
}

function EditorMenuButton({ 
  onClick, 
  active, 
  disabled, 
  title, 
  children 
}: { 
  onClick: () => void; 
  active?: boolean; 
  disabled?: boolean; 
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant={active ? "secondary" : "ghost"}
      size="icon"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="h-8 w-8"
      type="button"
    >
      {children}
    </Button>
  );
}

// Component for read-only view of rich content
export function RichContentView({ content }: { content: string }) {
  return (
    <div 
      className="prose dark:prose-invert max-w-none prose-sm sm:prose-base lg:prose-lg prose-headings:font-semibold prose-blockquote:border-l-primary prose-blockquote:border-l-2 prose-blockquote:pl-4 prose-blockquote:italic" 
      dangerouslySetInnerHTML={{ __html: content }} 
    />
  );
}
